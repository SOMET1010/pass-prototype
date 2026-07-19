-- Enrichit la verification operateur : consultation nommee de la base des operateurs (MTN/Orange/Moov)
-- avec statut « present / absent » (le titulaire est-il deja dans leur base ?).
-- (CREATE OR REPLACE de pass_lancer_verifications avec donnees_retour operateur enrichies —
--  voir 20260718194852_pass_rls_rpc.sql pour la version initiale.)
create or replace function pass_lancer_verifications(p_id_demande uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_personne personne; v_prof jsonb;
  r_identite verification_resultat; r_sociale verification_resultat;
  r_ligne verification_resultat; r_hist verification_resultat;
  v_reco demande_recommandation; v_num text;
begin
  if current_agent_role() is null then raise exception 'Acces refuse : agent non habilite.'; end if;
  select p.* into v_personne from demande d join personne p on p.id_personne = d.id_personne
    where d.id_demande = p_id_demande;
  if v_personne.id_personne is null then raise exception 'Demande introuvable.'; end if;
  v_prof := v_personne.profil_demo;
  r_identite := coalesce((v_prof->>'identite')::verification_resultat, 'concluant');
  r_sociale  := coalesce((v_prof->>'sociale')::verification_resultat, 'concluant');
  r_ligne    := coalesce((v_prof->>'ligne')::verification_resultat, 'concluant');
  if exists (select 1 from distribution di join demande dm on dm.id_demande = di.id_demande
             where dm.id_personne = v_personne.id_personne) then r_hist := 'non_concluant';
  else r_hist := 'concluant'; end if;
  delete from verification where id_demande = p_id_demande;
  insert into verification(id_demande, source, resultat, est_simule, donnees_retour) values
    (p_id_demande, 'oneci', r_identite, true,
       jsonb_build_object('libelle','Identite / piece','nom',v_personne.nom,'prenoms',v_personne.prenoms,'detail',v_prof->>'detail_identite')),
    (p_id_demande, 'rsu', r_sociale, true,
       jsonb_build_object('libelle','Eligibilite sociale','detail',v_prof->>'detail_sociale')),
    (p_id_demande, 'operateur', r_ligne, true,
       jsonb_build_object('libelle','Ligne mobile — Base des operateurs',
         'operateurs_consultes', jsonb_build_array('MTN CI','Orange CI','Moov Africa'),
         'present', (r_ligne <> 'indisponible'),
         'nom_operateur', v_prof->>'nom_operateur','detail_ligne', v_prof->>'detail_ligne')),
    (p_id_demande, 'historique', r_hist, false,
       jsonb_build_object('libelle','Historique PASS (referentiel interne)'));
  if r_hist = 'non_concluant' then v_reco := 'non_eligible';
  elsif r_sociale = 'non_concluant' then v_reco := 'non_eligible';
  elsif r_identite = 'non_concluant' then v_reco := 'a_instruire';
  elsif r_ligne in ('non_concluant','indisponible') then v_reco := 'a_instruire';
  else v_reco := 'eligible'; end if;
  update personne set statut_verif_identite =
    case r_identite when 'concluant' then 'verifie'::statut_verif_identite
                    when 'non_concluant' then 'echec'::statut_verif_identite
                    else 'non_verifie'::statut_verif_identite end
   where id_personne = v_personne.id_personne;
  update demande set recommandation = v_reco where id_demande = p_id_demande returning numero_dossier into v_num;
  perform _log('verifications lancees -> ' || v_reco, 'demande', v_num);
  return jsonb_build_object('recommandation', v_reco, 'identite', r_identite, 'sociale', r_sociale, 'ligne', r_ligne, 'historique', r_hist);
end;
$$;
