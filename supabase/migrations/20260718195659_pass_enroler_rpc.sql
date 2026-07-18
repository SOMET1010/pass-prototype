-- RPC d'enrôlement atomique : retrouve la personne par CNI (référentiel) ou la crée,
-- puis ouvre une demande brouillon pour la campagne. Retourne la demande (existante ou nouvelle).
create or replace function pass_enroler(
  p_numero_cni text, p_nom text, p_prenoms text, p_date_naissance date,
  p_zone_residence text, p_photo_url text, p_id_campagne uuid, p_canal demande_canal default 'assiste'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_personne personne; v_demande demande; v_existante uuid; v_reuse boolean := false;
begin
  if current_agent_role() is null then raise exception 'Accès refusé : agent non habilité.'; end if;

  select * into v_personne from personne where numero_cni = trim(p_numero_cni);
  if v_personne.id_personne is null then
    insert into personne(numero_cni, nom, prenoms, date_naissance, zone_residence, photo_url)
    values (trim(p_numero_cni), p_nom, p_prenoms, p_date_naissance, p_zone_residence, p_photo_url)
    returning * into v_personne;
    perform _log('création personne', 'personne', v_personne.id_personne::text);
  else
    v_reuse := true;
    if p_photo_url is not null then
      update personne set photo_url = p_photo_url where id_personne = v_personne.id_personne;
    end if;
  end if;

  -- Une seule demande active par personne et par campagne (contrainte composite)
  select id_demande into v_existante from demande
   where id_personne = v_personne.id_personne and id_campagne = p_id_campagne;
  if v_existante is not null then
    select * into v_demande from demande where id_demande = v_existante;
    return jsonb_build_object('demande', to_jsonb(v_demande), 'personne', to_jsonb(v_personne),
      'personne_reutilisee', v_reuse, 'demande_existante', true);
  end if;

  insert into demande(id_personne, id_campagne, canal, id_agent, etat)
  values (v_personne.id_personne, p_id_campagne, p_canal, current_agent_id(), 'brouillon')
  returning * into v_demande;
  perform _log('création demande', 'demande', v_demande.numero_dossier);

  return jsonb_build_object('demande', to_jsonb(v_demande), 'personne', to_jsonb(v_personne),
    'personne_reutilisee', v_reuse, 'demande_existante', false);
end;
$$;
grant execute on function pass_enroler(text,text,text,date,text,text,uuid,demande_canal) to authenticated;
