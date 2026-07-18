-- ============ Helpers d'identité (SECURITY DEFINER, contournent RLS) ============
create or replace function current_agent_id() returns uuid
language sql security definer stable set search_path = public as $$
  select id_agent from agent where user_id = auth.uid() limit 1;
$$;

create or replace function current_agent_role() returns agent_role
language sql security definer stable set search_path = public as $$
  select role from agent where user_id = auth.uid() and statut = 'actif' limit 1;
$$;

create or replace function is_active_agent() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from agent where user_id = auth.uid() and statut = 'actif');
$$;

create or replace function _log(p_action text, p_cible_type text, p_cible_id text)
returns void language plpgsql security definer set search_path = public as $$
declare v_acteur text;
begin
  select coalesce(identite, 'agent') into v_acteur from agent where user_id = auth.uid();
  insert into journal_audit(acteur, action, cible_type, cible_id)
  values (coalesce(v_acteur, coalesce(auth.email(), 'système')), p_action, p_cible_type, p_cible_id);
end;
$$;

-- ============ RLS : lecture pour agents actifs, aucune écriture directe ============
alter table agent          enable row level security;
alter table personne       enable row level security;
alter table campagne       enable row level security;
alter table demande        enable row level security;
alter table verification   enable row level security;
alter table decision       enable row level security;
alter table terminal       enable row level security;
alter table distribution   enable row level security;
alter table preuve_remise  enable row level security;
alter table journal_audit  enable row level security;

create policy sel_agent         on agent         for select to authenticated using (is_active_agent());
create policy sel_personne      on personne      for select to authenticated using (is_active_agent());
create policy sel_campagne      on campagne      for select to authenticated using (is_active_agent());
create policy sel_demande       on demande       for select to authenticated using (is_active_agent());
create policy sel_verification  on verification  for select to authenticated using (is_active_agent());
create policy sel_decision      on decision      for select to authenticated using (is_active_agent());
create policy sel_terminal      on terminal      for select to authenticated using (is_active_agent());
create policy sel_distribution  on distribution  for select to authenticated using (is_active_agent());
create policy sel_preuve        on preuve_remise for select to authenticated using (is_active_agent());
create policy sel_journal       on journal_audit for select to authenticated using (is_active_agent());
-- Aucune policy INSERT/UPDATE/DELETE : toute écriture directe via l'API est refusée.
-- Les écritures passent exclusivement par les RPC SECURITY DEFINER ci-dessous.

-- ============ RPC : créer une personne (RM-004) ============
create or replace function pass_creer_personne(
  p_numero_cni text, p_nom text, p_prenoms text, p_date_naissance date,
  p_zone_residence text, p_photo_url text, p_profil_demo jsonb default '{}'::jsonb
) returns personne language plpgsql security definer set search_path = public as $$
declare v personne;
begin
  if current_agent_role() is null then raise exception 'Accès refusé : agent non habilité.'; end if;
  insert into personne(numero_cni, nom, prenoms, date_naissance, zone_residence, photo_url, profil_demo)
  values (trim(p_numero_cni), p_nom, p_prenoms, p_date_naissance, p_zone_residence, p_photo_url, coalesce(p_profil_demo,'{}'::jsonb))
  returning * into v;
  perform _log('création personne', 'personne', v.id_personne::text);
  return v;
end;
$$;

-- ============ RPC : créer une demande (brouillon) — RM-063, RM-151 ============
create or replace function pass_creer_demande(
  p_id_personne uuid, p_id_campagne uuid, p_canal demande_canal default 'assiste'
) returns demande language plpgsql security definer set search_path = public as $$
declare v demande;
begin
  if current_agent_role() is null then raise exception 'Accès refusé : agent non habilité.'; end if;
  insert into demande(id_personne, id_campagne, canal, id_agent, etat)
  values (p_id_personne, p_id_campagne, p_canal, current_agent_id(), 'brouillon')
  returning * into v;
  perform _log('création demande', 'demande', v.numero_dossier);
  return v;
end;
$$;

-- ============ RPC : consentement (RM-184, RM-185) ============
create or replace function pass_enregistrer_consentement(
  p_id_demande uuid, p_moyen consentement_moyen
) returns demande language plpgsql security definer set search_path = public as $$
declare v demande;
begin
  if current_agent_role() is null then raise exception 'Accès refusé : agent non habilité.'; end if;
  update demande set consentement = true, consentement_moyen = p_moyen
   where id_demande = p_id_demande and etat in ('brouillon','soumise')
   returning * into v;
  if v.id_demande is null then raise exception 'Consentement impossible sur cette demande.'; end if;
  perform _log('recueil consentement (' || p_moyen || ')', 'demande', v.numero_dossier);
  return v;
end;
$$;

-- ============ RPC : lancer les 4 vérifications (RM-037, RM-038) ============
-- ONECI / RSU / opérateur = SIMULÉ (est_simule=true). Historique PASS = réel (référentiel interne).
create or replace function pass_lancer_verifications(p_id_demande uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_personne personne; v_prof jsonb;
  r_identite verification_resultat; r_sociale verification_resultat;
  r_ligne verification_resultat; r_hist verification_resultat;
  v_reco demande_recommandation; v_num text;
begin
  if current_agent_role() is null then raise exception 'Accès refusé : agent non habilité.'; end if;
  select p.* into v_personne from demande d join personne p on p.id_personne = d.id_personne
    where d.id_demande = p_id_demande;
  if v_personne.id_personne is null then raise exception 'Demande introuvable.'; end if;
  v_prof := v_personne.profil_demo;

  r_identite := coalesce((v_prof->>'identite')::verification_resultat, 'concluant');
  r_sociale  := coalesce((v_prof->>'sociale')::verification_resultat, 'concluant');
  r_ligne    := coalesce((v_prof->>'ligne')::verification_resultat, 'concluant');
  -- Historique PASS : vérification RÉELLE contre le référentiel interne
  if exists (select 1 from distribution di join demande dm on dm.id_demande = di.id_demande
             where dm.id_personne = v_personne.id_personne) then
    r_hist := 'non_concluant';
  else
    r_hist := 'concluant';
  end if;

  delete from verification where id_demande = p_id_demande;
  insert into verification(id_demande, source, resultat, est_simule, donnees_retour) values
    (p_id_demande, 'oneci', r_identite, true,
       jsonb_build_object('libelle','Identité / pièce', 'nom', v_personne.nom, 'prenoms', v_personne.prenoms, 'detail', v_prof->>'detail_identite')),
    (p_id_demande, 'rsu', r_sociale, true,
       jsonb_build_object('libelle','Éligibilité sociale', 'detail', v_prof->>'detail_sociale')),
    (p_id_demande, 'operateur', r_ligne, true,
       jsonb_build_object('libelle','Ligne mobile', 'nom_operateur', v_prof->>'nom_operateur', 'detail', v_prof->>'detail_ligne')),
    (p_id_demande, 'historique', r_hist, false,
       jsonb_build_object('libelle','Historique PASS (référentiel interne)'));

  -- Recommandation (RM-037 / RM-038)
  if r_hist = 'non_concluant' then      v_reco := 'non_eligible';   -- déjà bénéficiaire (RM-032)
  elsif r_sociale = 'non_concluant' then v_reco := 'non_eligible';  -- pas ayant droit
  elsif r_identite = 'non_concluant' then v_reco := 'a_instruire';
  elsif r_ligne in ('non_concluant','indisponible') then v_reco := 'a_instruire'; -- RM-038
  else v_reco := 'eligible';
  end if;

  update personne set statut_verif_identite =
    case r_identite when 'concluant' then 'verifie'::statut_verif_identite
                    when 'non_concluant' then 'echec'::statut_verif_identite
                    else 'non_verifie'::statut_verif_identite end
   where id_personne = v_personne.id_personne;

  update demande set recommandation = v_reco where id_demande = p_id_demande returning numero_dossier into v_num;
  perform _log('vérifications lancées → ' || v_reco, 'demande', v_num);

  return jsonb_build_object('recommandation', v_reco,
    'identite', r_identite, 'sociale', r_sociale, 'ligne', r_ligne, 'historique', r_hist);
end;
$$;

-- ============ RPC : soumettre la demande (RM-064, RM-184) ============
create or replace function pass_soumettre_demande(p_id_demande uuid)
returns demande language plpgsql security definer set search_path = public as $$
declare v demande;
begin
  if current_agent_role() is null then raise exception 'Accès refusé : agent non habilité.'; end if;
  select * into v from demande where id_demande = p_id_demande;
  if v.id_demande is null then raise exception 'Demande introuvable.'; end if;
  if not v.consentement or v.consentement_moyen is null then
    raise exception 'Soumission impossible : le consentement est obligatoire (RM-184).';
  end if;
  update demande set etat = 'soumise', date_soumission = now()
   where id_demande = p_id_demande and etat = 'brouillon' returning * into v;
  perform _log('soumission demande', 'demande', v.numero_dossier);
  return v;
end;
$$;

-- ============ RPC : décision (RM-034, RM-091, RM-092, RM-099) ============
create or replace function pass_prononcer_decision(
  p_id_demande uuid, p_sens decision_sens, p_motif text default null
) returns decision language plpgsql security definer set search_path = public as $$
declare v decision; v_role agent_role; v_num text;
begin
  v_role := current_agent_role();
  if v_role is null or v_role = 'remise' then
    raise exception 'Accès refusé : ce rôle ne peut pas prononcer de décision.';
  end if;
  insert into decision(id_demande, sens, motif, id_agent)
  values (p_id_demande, p_sens, nullif(trim(coalesce(p_motif,'')),''), current_agent_id())
  returning * into v;   -- CHECK chk_motif_si_refus + trigger quota s'appliquent ici
  update demande set etat = (case p_sens when 'validee' then 'validee' else 'refusee' end)::demande_etat
   where id_demande = p_id_demande returning numero_dossier into v_num;
  perform _log('décision ' || p_sens || coalesce(' — ' || p_motif, ''), 'demande', v_num);
  return v;
end;
$$;

-- ============ RPC : mise en instruction (RM-038) ============
create or replace function pass_mettre_en_instruction(p_id_demande uuid)
returns demande language plpgsql security definer set search_path = public as $$
declare v demande;
begin
  if current_agent_role() is null or current_agent_role() = 'remise' then
    raise exception 'Accès refusé.';
  end if;
  if exists (select 1 from decision where id_demande = p_id_demande) then
    raise exception 'Une décision a déjà été prononcée (RM-092).';
  end if;
  update demande set etat = 'a_instruire' where id_demande = p_id_demande returning * into v;
  perform _log('mise en instruction', 'demande', v.numero_dossier);
  return v;
end;
$$;

-- ============ RPC : effectuer la remise (RM-091, RM-181, RM-151) ============
create or replace function pass_effectuer_remise(
  p_id_demande uuid, p_id_terminal uuid, p_point_remise text,
  p_photo_url text default null, p_geolocalisation text default 'Simulée — GPS non certifié (prototype)'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_dist distribution; v_pers uuid; v_num text; v_role agent_role;
begin
  v_role := current_agent_role();
  if v_role is null or v_role not in ('remise','superviseur') then
    raise exception 'Accès refusé : seul un agent de remise peut effectuer une remise.';
  end if;
  select id_personne, numero_dossier into v_pers, v_num from demande where id_demande = p_id_demande;
  -- distribution (triggers : RM-091 dossier validé, RM-032 non-cumul)
  insert into distribution(id_demande, id_terminal, id_agent, point_remise)
  values (p_id_demande, p_id_terminal, current_agent_id(), p_point_remise)
  returning * into v_dist;
  -- preuve obligatoire dans la même transaction (RM-181)
  insert into preuve_remise(id_distribution, photo_url, geolocalisation, id_agent, est_simule)
  values (v_dist.id_distribution, p_photo_url, p_geolocalisation, current_agent_id(), true);
  -- terminal affecté
  update terminal set statut = 'remis', id_personne = v_pers where id_terminal = p_id_terminal;
  perform _log('remise terminal', 'demande', v_num);
  return jsonb_build_object('id_distribution', v_dist.id_distribution, 'numero_dossier', v_num);
end;
$$;

grant execute on function pass_creer_personne(text,text,text,date,text,text,jsonb) to authenticated;
grant execute on function pass_creer_demande(uuid,uuid,demande_canal) to authenticated;
grant execute on function pass_enregistrer_consentement(uuid,consentement_moyen) to authenticated;
grant execute on function pass_lancer_verifications(uuid) to authenticated;
grant execute on function pass_soumettre_demande(uuid) to authenticated;
grant execute on function pass_prononcer_decision(uuid,decision_sens,text) to authenticated;
grant execute on function pass_mettre_en_instruction(uuid) to authenticated;
grant execute on function pass_effectuer_remise(uuid,uuid,text,text,text) to authenticated;
grant execute on function current_agent_role() to authenticated;
grant execute on function current_agent_id() to authenticated;
grant execute on function is_active_agent() to authenticated;
