-- ============================================================================
-- Corrections de recette (rapport QA du 08/09/2026).
-- ANO-01/02/03 : le moteur d'éligibilité v3 déduit désormais ses contrôles de
--   régularité des RÉSULTATS DE VÉRIFICATION réels (source oneci/rsu/operateur/
--   historique) — cohérence avec le bloc « Contrôles d'éligibilité » et respect
--   de la doctrine : ligne absente/non concordante → à instruire (jamais refus
--   auto) ; non-cumul (historique) → refus sur le bon contrôle.
-- ANO-05 : décision & mise en instruction réservées à instructeur/superviseur.
-- ANO-06 : consentement refusé sans preuve (signature vide / témoin vide).
-- ============================================================================

create or replace function pass_evaluer_demande(p_id_demande uuid)
returns evaluation_individuelle language plpgsql security definer set search_path = public as $$
declare
  d demande; per personne; camp campagne; v evaluation_individuelle;
  h bigint; ref_date date; v_age int;
  techno text; activite int; seuil_inact int;
  c1 numeric; c2 numeric; c3 numeric; c4 numeric; c5 numeric;
  p1 int; p2 int; p3 int; p4 int; p5 int;
  s_p1 int; s_p2 int; s_p3 int; sc numeric; v_rang rang_priorite;
  r_ident text; r_major text; r_rsu text; r_cumul text; r_ligne text; r_camp text;
  v_statut statut_regularite; v_snap jsonb; v_quota_ok boolean;
  m_ec text; m_rsu text; m_op text; nni_obl boolean;
  rv_id text; rv_soc text; rv_lig text; rv_his text;
  det_ident text; det_rsu text; det_ligne text;
begin
  if not is_active_agent() then raise exception 'Accès refusé.'; end if;
  select * into d from demande where id_demande = p_id_demande;
  if d.id_demande is null then raise exception 'Demande introuvable.'; end if;
  select * into per from personne where id_personne = d.id_personne;
  select * into camp from campagne where id_campagne = d.id_campagne;

  -- Cohérence : s'appuyer sur les mêmes vérifications que le bloc « Contrôles d'éligibilité ».
  if not exists (select 1 from verification where id_demande = p_id_demande) then
    perform pass_lancer_verifications(p_id_demande);
  end if;
  select resultat::text into rv_id  from verification where id_demande = p_id_demande and source='oneci' limit 1;
  select resultat::text into rv_soc from verification where id_demande = p_id_demande and source='rsu' limit 1;
  select resultat::text into rv_lig from verification where id_demande = p_id_demande and source='operateur' limit 1;
  select resultat::text into rv_his from verification where id_demande = p_id_demande and source='historique' limit 1;

  h := abs(hashtext(p_id_demande::text)::bigint);
  ref_date := coalesce(d.date_soumission::date, current_date);
  v_age := extract(year from age(ref_date, per.date_naissance));
  seuil_inact := coalesce(param_num('seuil_inactivite_terminal_jours'),120);
  m_ec := coalesce(source_mode('etat_civil'),'service');
  m_rsu := coalesce(source_mode('rsu'),'service');
  m_op := coalesce(source_mode('operateur'),'service');
  nni_obl := coalesce(param_txt('nni_obligatoire'),'false') = 'true';

  -- Identité (ONECI) : concluant → OK ; sinon → à instruire (concordance à examiner, jamais refus auto)
  r_ident := case when coalesce(rv_id,'indisponible') = 'concluant' then 'concluant' else 'indisponible' end;
  det_ident := coalesce((select donnees_retour->>'detail' from verification where id_demande=p_id_demande and source='oneci' limit 1),
                        'Pièce valide, titulaire vivant, absence d''usurpation');
  if nni_obl and per.nni is null then r_ident := 'indisponible'; det_ident := 'NNI requis (obligatoire par configuration) — absent'; end if;
  if m_ec = 'declaratif' then r_ident := 'indisponible'; det_ident := det_ident || ' — source en mode déclaratif'; end if;

  -- Majorité (interne, réel)
  r_major := case when v_age >= coalesce(param_num('age_minimum'),18) then 'concluant' else 'non_concluant' end;

  -- Ayant droit social (RSU) : non_concluant → refus ; indisponible → à instruire
  r_rsu := coalesce(rv_soc,'indisponible');
  det_rsu := coalesce((select donnees_retour->>'detail' from verification where id_demande=p_id_demande and source='rsu' limit 1),
                      'Statut du ménage au regard des dispositifs sociaux');
  if m_rsu = 'declaratif' then r_rsu := 'indisponible'; det_rsu := det_rsu || ' — source en mode déclaratif'; end if;

  -- Non-cumul (historique PASS) : non_concluant → refus (RM-032), sur CE contrôle
  r_cumul := case when coalesce(rv_his,'concluant') = 'non_concluant' then 'non_concluant' else 'concluant' end;

  -- Ligne mobile (opérateur) : toute anomalie (absente, non concordante, indisponible) → à instruire
  r_ligne := case when coalesce(rv_lig,'indisponible') = 'concluant' then 'concluant' else 'indisponible' end;
  det_ligne := coalesce((select coalesce(donnees_retour->>'detail_ligne', donnees_retour->>'libelle')
                         from verification where id_demande=p_id_demande and source='operateur' limit 1),
                        'Titulaire concordant, ancienneté minimale');
  if m_op = 'declaratif' then r_ligne := 'indisponible'; det_ligne := det_ligne || ' — source en mode déclaratif'; end if;

  -- Campagne (interne)
  v_quota_ok := camp.id_campagne is not null and camp.etat <> 'cloturee'
                and (select count(*) from decision dec join demande dm on dm.id_demande = dec.id_demande
                     where dm.id_campagne = camp.id_campagne and dec.sens='validee'
                       and not exists (select 1 from annulation a where a.cible_type='decision' and a.id_cible=dec.id_decision))
                    < coalesce(camp.quota_total, 999999);
  r_camp := case when v_quota_ok then 'concluant' when camp.id_campagne is null then 'indisponible' else 'non_concluant' end;

  if 'non_concluant' in (r_ident,r_major,r_rsu,r_cumul,r_ligne,r_camp) then v_statut := 'refus';
  elsif 'indisponible' in (r_ident,r_major,r_rsu,r_cumul,r_ligne,r_camp) then v_statut := 'a_instruire';
  else v_statut := 'recevable'; end if;

  -- Score individuel C1–C5 (signaux simulés déterministes ; jamais bloquant)
  p1 := coalesce(param_num('score_c1_poids'),30); p2 := coalesce(param_num('score_c2_poids'),25);
  p3 := coalesce(param_num('score_c3_poids'),20); p4 := coalesce(param_num('score_c4_poids'),15);
  p5 := coalesce(param_num('score_c5_poids'),10);
  s_p1 := coalesce(param_num('seuil_p1'),75); s_p2 := coalesce(param_num('seuil_p2'),55); s_p3 := coalesce(param_num('seuil_p3'),35);
  techno := (array['2G','3G','4G'])[1 + (h % 3)];
  activite := (h/3 % 300);
  c1 := case techno when '4G' then 0.20 when '3G' then 0.50 else 0.85 end;
  if activite > seuil_inact then c1 := greatest(c1, 0.85); end if;
  c2 := round((0.40 + 0.55 * ((h/11 % 1000)::numeric/1000))::numeric, 3);
  c3 := round((0.20 + 0.70 * ((h/13 % 1000)::numeric/1000))::numeric, 3);
  c4 := round((0.20 + 0.70 * ((h/17 % 1000)::numeric/1000))::numeric, 3);
  c5 := round((0.55 * ((h/19 % 1000)::numeric/1000))::numeric, 3);
  c1 := round(c1::numeric, 3);
  sc := p1*c1 + p2*c2 + p3*c3 + p4*c4 + p5*c5;
  v_rang := case when v_statut <> 'recevable' then null
                 when sc >= s_p1 then 'P1' when sc >= s_p2 then 'P2' when sc >= s_p3 then 'P3' else 'P4' end;
  v_snap := param_snapshot(array['score_individuel','regularite','sources']);

  delete from evaluation_individuelle where id_demande = p_id_demande;
  insert into evaluation_individuelle(id_demande, statut_regularite, score, rang_priorite, parametres, id_agent)
  values (p_id_demande, v_statut, case when v_statut='recevable' then round(sc,2) else null end, v_rang, v_snap, current_agent_id())
  returning * into v;

  insert into controle_regularite(id_evaluation, controle, resultat, source, detail, ordre) values
    (v.id_evaluation,'identite',    r_ident,'État civil / ONECI', det_ident,1),
    (v.id_evaluation,'majorite',    r_major,'Interne', v_age||' ans à la date de la demande',2),
    (v.id_evaluation,'ayant_droit', r_rsu,  'Registre social (RSU)', det_rsu,3),
    (v.id_evaluation,'non_cumul',   r_cumul,'Historique PASS','Absence d''attribution sur la période de non-cumul (RM-032)',4),
    (v.id_evaluation,'ligne_mobile',r_ligne,'Opérateurs', det_ligne,5),
    (v.id_evaluation,'campagne',    r_camp, 'Interne','Localité ouverte, quota disponible',6);

  if v_statut = 'recevable' then
    insert into score_dimension(id_evaluation, dimension, libelle, valeur, poids, contribution, detail) values
      (v.id_evaluation,'C1','Disponibilité d''un smartphone personnel',c1,p1,round(p1*c1,2),'Ligne '||techno||', dernière activité il y a '||activite||' j (seuil '||seuil_inact||' j)'),
      (v.id_evaluation,'C2','Vulnérabilité socio-économique',c2,p2,round(p2*c2,2),'Proxy taux de pauvreté (simulé)'),
      (v.id_evaluation,'C3','Accès autonome au numérique',c3,p3,round(p3*c3,2),'Dépendance à un équipement partagé / un tiers (simulé)'),
      (v.id_evaluation,'C4','Accessibilité au marché',c4,p4,round(p4*c4,2),'Possibilité d''acheter / financer / réparer (simulé)'),
      (v.id_evaluation,'C5','Vulnérabilités spécifiques',c5,p5,round(p5*c5,2),'Vulnérabilités objectivement définies (simulé)');
  end if;

  update demande set
    statut_regularite = v_statut, rang_priorite = v_rang, score_individuel = v.score,
    recommandation = case v_statut when 'recevable' then 'eligible'::demande_recommandation
                                   when 'refus' then 'non_eligible'::demande_recommandation
                                   else 'a_instruire'::demande_recommandation end
  where id_demande = p_id_demande;
  perform _log('évaluation individuelle : '||v_statut||coalesce(' · rang '||v_rang,'')||coalesce(' · score '||round(sc,1),''),
               'demande', p_id_demande::text);
  return v;
end;
$$;
grant execute on function pass_evaluer_demande(uuid) to authenticated;

-- ANO-05 : décision réservée à instructeur / superviseur
create or replace function pass_prononcer_decision(p_id_demande uuid, p_sens decision_sens, p_motif text default null)
returns decision language plpgsql security definer set search_path = public as $$
declare v decision; v_role agent_role; v_num text;
begin
  v_role := current_agent_role();
  if v_role is null or v_role not in ('instructeur','superviseur') then
    raise exception 'Accès refusé : seuls l''instructeur et le superviseur peuvent prononcer une décision.';
  end if;
  insert into decision(id_demande, sens, motif, id_agent)
  values (p_id_demande, p_sens, nullif(trim(coalesce(p_motif,'')),''), current_agent_id())
  returning * into v;
  update demande set etat = (case p_sens when 'validee' then 'validee' else 'refusee' end)::demande_etat
   where id_demande = p_id_demande returning numero_dossier into v_num;
  perform _log('décision ' || p_sens || coalesce(' — ' || p_motif, ''), 'demande', v_num);
  return v;
end;
$$;
grant execute on function pass_prononcer_decision(uuid,decision_sens,text) to authenticated;

-- ANO-05 : mise en instruction réservée à instructeur / superviseur
create or replace function pass_mettre_en_instruction(p_id_demande uuid)
returns demande language plpgsql security definer set search_path = public as $$
declare v demande;
begin
  if current_agent_role() is null or current_agent_role() not in ('instructeur','superviseur') then
    raise exception 'Accès refusé : réservé à l''instructeur et au superviseur.';
  end if;
  if exists (select 1 from decision where id_demande = p_id_demande) then
    raise exception 'Une décision a déjà été prononcée (RM-092).';
  end if;
  update demande set etat = 'a_instruire' where id_demande = p_id_demande returning * into v;
  perform _log('mise en instruction', 'demande', v.numero_dossier);
  return v;
end;
$$;
grant execute on function pass_mettre_en_instruction(uuid) to authenticated;

-- ANO-06 : consentement refusé sans preuve conforme au moyen
create or replace function pass_enregistrer_consentement(p_id_demande uuid, p_moyen consentement_moyen, p_signature text default null, p_temoin text default null)
returns demande language plpgsql security definer set search_path = public as $$
declare v demande;
begin
  if current_agent_role() is null then raise exception 'Accès refusé : agent non habilité.'; end if;
  if p_moyen = 'signature' and coalesce(trim(p_signature),'') = '' then
    raise exception 'Signature requise pour le consentement par signature (RM-184).';
  end if;
  if p_moyen = 'assiste_temoin' and coalesce(trim(p_temoin),'') = '' then
    raise exception 'Nom et qualité du témoin requis pour le consentement assisté (RM-184).';
  end if;
  update demande
     set consentement = true, consentement_moyen = p_moyen,
         consentement_signature = nullif(p_signature, ''),
         consentement_temoin = nullif(trim(coalesce(p_temoin,'')), '')
   where id_demande = p_id_demande and etat in ('brouillon','soumise')
   returning * into v;
  if v.id_demande is null then raise exception 'Consentement impossible sur cette demande.'; end if;
  perform _log('recueil consentement (' || p_moyen || ')', 'demande', v.numero_dossier);
  return v;
end;
$$;
grant execute on function pass_enregistrer_consentement(uuid,consentement_moyen,text,text) to authenticated;
