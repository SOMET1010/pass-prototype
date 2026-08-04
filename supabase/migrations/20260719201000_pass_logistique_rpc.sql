-- ============================================================================
-- RPCs du module logistique — toutes les écritures passent ici (SECURITY
-- DEFINER, réservées au superviseur), et chaque déplacement est journalisé.
-- ============================================================================

-- Journalise un mouvement de stock.
create or replace function _mouv(p_type mouvement_type, p_terminal uuid, p_colis uuid,
                                 p_qte int, p_ori text, p_dest text, p_ref text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into mouvement_stock(type_mvt, id_terminal, id_colis, quantite, origine, destination, reference, id_agent)
  values (p_type, p_terminal, p_colis, coalesce(p_qte,1), p_ori, p_dest, p_ref, current_agent_id());
end;
$$;

create or replace function _is_superviseur() returns boolean
language sql security definer stable set search_path = public as $$
  select current_agent_role() = 'superviseur';
$$;

-- ---- Entrepôt & emplacements (données de référence) ----
create or replace function pass_creer_entrepot(p_libelle text, p_zone text, p_adresse text)
returns entrepot language plpgsql security definer set search_path = public as $$
declare v entrepot;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  insert into entrepot(libelle, zone, adresse) values (p_libelle, p_zone, p_adresse) returning * into v;
  perform _log('création entrepôt ' || v.libelle, 'entrepot', v.id_entrepot::text);
  return v;
end;$$;
grant execute on function pass_creer_entrepot(text,text,text) to authenticated;

create or replace function pass_creer_emplacement(p_id_entrepot uuid, p_code text, p_description text)
returns emplacement language plpgsql security definer set search_path = public as $$
declare v emplacement;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  insert into emplacement(id_entrepot, code, description) values (p_id_entrepot, p_code, p_description) returning * into v;
  perform _log('création emplacement ' || v.code, 'emplacement', v.id_emplacement::text);
  return v;
end;$$;
grant execute on function pass_creer_emplacement(uuid,text,text) to authenticated;

-- ---- Fournisseur ----
create or replace function pass_creer_fournisseur(p_raison text, p_pays text, p_email text, p_tel text)
returns fournisseur language plpgsql security definer set search_path = public as $$
declare v fournisseur;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  insert into fournisseur(raison_sociale, pays, contact_email, contact_tel)
  values (p_raison, coalesce(nullif(trim(coalesce(p_pays,'')),''),'International'), p_email, p_tel)
  returning * into v;
  perform _log('création fournisseur ' || v.raison_sociale, 'fournisseur', v.id_fournisseur::text);
  return v;
end;
$$;
grant execute on function pass_creer_fournisseur(text,text,text,text) to authenticated;

-- ---- Arrivage + liste de colisage (crée un colis scannable par ligne) ----
-- p_lignes : jsonb array [{modele, quantite, imei_debut, imei_fin}]
create or replace function pass_creer_arrivage(p_reference text, p_id_fournisseur uuid, p_date_prevue date, p_lignes jsonb)
returns arrivage language plpgsql security definer set search_path = public as $$
declare v arrivage; l jsonb; v_ligne uuid; i int := 0; v_code text;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  insert into arrivage(reference, id_fournisseur, date_prevue, statut)
  values (p_reference, p_id_fournisseur, p_date_prevue, 'attendu') returning * into v;
  for l in select * from jsonb_array_elements(coalesce(p_lignes,'[]'::jsonb)) loop
    i := i + 1;
    insert into colisage_ligne(id_arrivage, modele, quantite_attendue, imei_debut, imei_fin)
    values (v.id_arrivage, l->>'modele', (l->>'quantite')::int, l->>'imei_debut', l->>'imei_fin')
    returning id_ligne into v_ligne;
    v_code := 'CX-' || regexp_replace(upper(v.reference),'[^A-Z0-9]','','g') || '-' || lpad(i::text,3,'0');
    insert into colis(id_arrivage, id_ligne, code_barre, modele, quantite_attendue, imei_debut, imei_fin, statut)
    values (v.id_arrivage, v_ligne, v_code, l->>'modele', (l->>'quantite')::int, l->>'imei_debut', l->>'imei_fin', 'attendu');
  end loop;
  perform _log('création arrivage ' || v.reference || ' (' || i || ' colis attendus)', 'arrivage', v.id_arrivage::text);
  return v;
end;
$$;
grant execute on function pass_creer_arrivage(text, uuid, date, jsonb) to authenticated;

-- ---- Réception d'un colis (scan code-barre) : crée les terminaux, détecte l'écart ----
create or replace function pass_receptionner_colis(p_code_barre text, p_quantite_recue int)
returns colis language plpgsql security definer set search_path = public as $$
declare v colis; v_arr arrivage; v_base bigint; k int; v_imei text; v_ecart int;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  if p_quantite_recue < 0 then raise exception 'Quantité invalide.'; end if;
  select * into v from colis where code_barre = p_code_barre;
  if v.id_colis is null then raise exception 'Colis introuvable (code-barre %).', p_code_barre; end if;
  if v.statut in ('recu','ecart','range') then raise exception 'Colis déjà réceptionné.'; end if;

  v_ecart := p_quantite_recue - v.quantite_attendue;
  select * into v_arr from arrivage where id_arrivage = v.id_arrivage;

  -- Création des terminaux (traçabilité par IMEI), entrée en entrepôt (point NULL).
  v_base := nullif(regexp_replace(coalesce(v.imei_debut,''), '\D','','g'),'')::bigint;
  for k in 0 .. (p_quantite_recue - 1) loop
    if v_base is not null then
      v_imei := lpad((v_base + k)::text, 15, '0');
    else
      v_imei := 'IMEI-' || upper(substr(v.code_barre,4)) || '-' || lpad((k+1)::text,4,'0');
    end if;
    insert into terminal(modele, imei, statut, id_colis, id_fournisseur, date_entree)
    values (v.modele, v_imei, 'en_stock', v.id_colis, v_arr.id_fournisseur, now())
    on conflict (imei) do nothing;
  end loop;

  update colis set quantite_recue = p_quantite_recue,
                   ecart = v_ecart,
                   statut = (case when v_ecart = 0 then 'recu' else 'ecart' end)::colis_statut,
                   horodatage_recu = now()
   where id_colis = v.id_colis returning * into v;
  update arrivage set statut = 'en_reception' where id_arrivage = v.id_arrivage and statut = 'attendu';

  perform _mouv('reception', null, v.id_colis, p_quantite_recue, v_arr.reference, 'Entrepôt', v.code_barre);
  perform _log('réception colis ' || v.code_barre || ' (' || p_quantite_recue || ' reçus, écart ' || v_ecart || ')',
               'colis', v.id_colis::text);
  return v;
end;
$$;
grant execute on function pass_receptionner_colis(text, int) to authenticated;

-- ---- Rangement d'un colis à un emplacement ----
create or replace function pass_ranger_colis(p_id_colis uuid, p_id_emplacement uuid)
returns colis language plpgsql security definer set search_path = public as $$
declare v colis; v_emp text;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  update terminal set id_emplacement = p_id_emplacement where id_colis = p_id_colis and statut = 'en_stock';
  update colis set id_emplacement = p_id_emplacement, statut = 'range' where id_colis = p_id_colis returning * into v;
  if v.id_colis is null then raise exception 'Colis introuvable.'; end if;
  select code into v_emp from emplacement where id_emplacement = p_id_emplacement;
  perform _mouv('rangement', null, v.id_colis, coalesce(v.quantite_recue,0), 'Réception', coalesce(v_emp,'emplacement'), v.code_barre);
  perform _log('rangement colis ' || v.code_barre || ' → ' || coalesce(v_emp,'-'), 'colis', v.id_colis::text);
  return v;
end;
$$;
grant execute on function pass_ranger_colis(uuid, uuid) to authenticated;

-- ---- Ouverture d'un point PASS mobile (campagne) + mission ----
create or replace function pass_ouvrir_point_mobile(p_libelle text, p_zone text, p_lat double precision,
                                                    p_lon double precision, p_id_campagne uuid, p_reference text)
returns point_retrait language plpgsql security definer set search_path = public as $$
declare v point_retrait; v_mref text;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  insert into point_retrait(libelle, zone, actif, type_point, statut_point, latitude, longitude, id_campagne)
  values (p_libelle, p_zone, true, 'mobile', 'actif', p_lat, p_lon, p_id_campagne)
  returning * into v;
  v_mref := coalesce(nullif(trim(coalesce(p_reference,'')),''), 'MIS-' || upper(substr(replace(v.id_point::text,'-',''),1,6)));
  insert into mission(reference, id_point_retrait, id_campagne, statut, latitude, longitude)
  values (v_mref, v.id_point, p_id_campagne, 'preparee', p_lat, p_lon);
  perform _log('ouverture point mobile ' || v.libelle, 'point_retrait', v.id_point::text);
  return v;
end;
$$;
grant execute on function pass_ouvrir_point_mobile(text,text,double precision,double precision,uuid,text) to authenticated;

-- ---- Paramétrage de l'équipe d'un point ----
create or replace function pass_config_equipe(p_id_point uuid, p_libelle text, p_vehicule text, p_zone text, p_membres uuid[])
returns equipe language plpgsql security definer set search_path = public as $$
declare v equipe; m uuid;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  insert into equipe(libelle, id_point_retrait, vehicule, zone)
  values (p_libelle, p_id_point, p_vehicule, p_zone) returning * into v;
  if p_membres is not null then
    foreach m in array p_membres loop
      insert into equipe_membre(id_equipe, id_agent) values (v.id_equipe, m)
      on conflict (id_equipe, id_agent) do nothing;
    end loop;
  end if;
  perform _log('paramétrage équipe ' || v.libelle || ' (' || coalesce(array_length(p_membres,1),0) || ' membres)',
               'equipe', v.id_equipe::text);
  return v;
end;
$$;
grant execute on function pass_config_equipe(uuid,text,text,text,uuid[]) to authenticated;

-- ---- Mise à jour de la géolocalisation d'un point (et mission liée) ----
create or replace function pass_maj_geoloc(p_id_point uuid, p_lat double precision, p_lon double precision)
returns point_retrait language plpgsql security definer set search_path = public as $$
declare v point_retrait;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  update point_retrait set latitude = p_lat, longitude = p_lon where id_point = p_id_point returning * into v;
  if v.id_point is null then raise exception 'Point introuvable.'; end if;
  update mission set latitude = p_lat, longitude = p_lon where id_point_retrait = p_id_point and statut <> 'cloturee';
  perform _log('mise à jour géolocalisation ' || v.libelle, 'point_retrait', v.id_point::text);
  return v;
end;
$$;
grant execute on function pass_maj_geoloc(uuid, double precision, double precision) to authenticated;

-- ---- Transfert (bon de sortie) : entrepôt → point (fixe ou mobile) ----
create or replace function pass_transferer_vers_point(p_id_point_dest uuid, p_modele text, p_quantite int, p_reference text)
returns bon_transfert language plpgsql security definer set search_path = public as $$
declare v bon_transfert; v_ids uuid[]; v_count int; v_ref text; tid uuid; v_dest text;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  if p_quantite <= 0 then raise exception 'Quantité invalide.'; end if;

  select array_agg(id_terminal) into v_ids from (
    select id_terminal from terminal
     where statut = 'en_stock' and id_point_retrait is null
       and (p_modele is null or modele = p_modele)
     order by imei limit p_quantite
  ) s;
  v_count := coalesce(array_length(v_ids,1),0);
  if v_count = 0 then raise exception 'Aucun terminal disponible en entrepôt pour ce modèle.'; end if;

  update terminal set id_point_retrait = p_id_point_dest, id_emplacement = null where id_terminal = any(v_ids);

  select libelle into v_dest from point_retrait where id_point = p_id_point_dest;
  v_ref := coalesce(nullif(trim(coalesce(p_reference,'')),''), 'BT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)));
  insert into bon_transfert(reference, origine_type, id_point_dest, modele, quantite, id_agent)
  values (v_ref, 'entrepot', p_id_point_dest, p_modele, v_count, current_agent_id()) returning * into v;

  foreach tid in array v_ids loop
    perform _mouv('transfert', tid, null, 1, 'Entrepôt', coalesce(v_dest,'point'), v_ref);
  end loop;
  perform _log('transfert de ' || v_count || ' terminal(aux) vers ' || coalesce(v_dest,'-'), 'point_retrait', p_id_point_dest::text);
  return v;
end;
$$;
grant execute on function pass_transferer_vers_point(uuid, text, int, text) to authenticated;

-- ---- Démarrage / clôture de mission + rapport ----
create or replace function pass_demarrer_mission(p_id_mission uuid)
returns mission language plpgsql security definer set search_path = public as $$
declare v mission;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  update mission set statut = 'en_cours', date_debut = now() where id_mission = p_id_mission returning * into v;
  if v.id_mission is null then raise exception 'Mission introuvable.'; end if;
  update point_retrait set statut_point = 'en_mission' where id_point = v.id_point_retrait;
  perform _log('démarrage mission ' || v.reference, 'mission', v.id_mission::text);
  return v;
end;
$$;
grant execute on function pass_demarrer_mission(uuid) to authenticated;

create or replace function pass_cloturer_mission(p_id_mission uuid, p_distribues int, p_retours int,
                                                 p_incidents text, p_observations text,
                                                 p_lat double precision, p_lon double precision)
returns rapport_mission language plpgsql security definer set search_path = public as $$
declare v rapport_mission; v_mis mission; v_reste int;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  select * into v_mis from mission where id_mission = p_id_mission;
  if v_mis.id_mission is null then raise exception 'Mission introuvable.'; end if;

  select count(*) into v_reste from terminal where id_point_retrait = v_mis.id_point_retrait and statut = 'en_stock';

  insert into rapport_mission(id_mission, distribues, retours, stock_restant, incidents, observations, id_agent, latitude, longitude)
  values (p_id_mission, coalesce(p_distribues,0), coalesce(p_retours,0), v_reste, p_incidents, p_observations,
          current_agent_id(), p_lat, p_lon) returning * into v;

  update mission set statut = 'cloturee', date_fin = now() where id_mission = p_id_mission;
  update point_retrait set statut_point = 'actif' where id_point = v_mis.id_point_retrait;
  if coalesce(p_retours,0) > 0 then
    perform _mouv('retour', null, null, p_retours, 'Point mobile', 'Entrepôt', v_mis.reference);
  end if;
  perform _log('clôture mission ' || v_mis.reference || ' (' || coalesce(p_distribues,0) || ' distribués, ' || v_reste || ' restants)',
               'mission', p_id_mission::text);
  return v;
end;
$$;
grant execute on function pass_cloturer_mission(uuid,int,int,text,text,double precision,double precision) to authenticated;
