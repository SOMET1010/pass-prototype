-- ============================================================================
-- CIBLAGE INDIVIDUEL (CDC Éligibilité v3, § 3) — refonte du moteur.
--   Deux mécanismes STRICTEMENT séparés :
--   • Contrôles de régularité (§3.1) : bloquants, 0 point → « a-t-on le droit
--     de remettre un terminal à cette personne ? »  (recevable / refus / à instruire)
--   • Score individuel C1–C5 (§3.2) : jamais bloquant, produit un RANG P1–P4 (§3.3).
--   Le résultat n'est pas un verdict binaire. Une demande non servie reste
--   recevable ; un refus ne vient QUE d'un contrôle de régularité en échec.
--   Poids et seuils proviennent des paramètres administrables (jamais en dur) ;
--   le jeu de paramètres utilisé est archivé avec l'évaluation (reproductibilité).
-- ============================================================================

create type statut_regularite as enum ('recevable','refus','a_instruire');
create type rang_priorite     as enum ('P1','P2','P3','P4');

alter table demande add column statut_regularite statut_regularite;
alter table demande add column rang_priorite      rang_priorite;
alter table demande add column score_individuel   numeric(6,2);

create table evaluation_individuelle (
  id_evaluation     uuid primary key default gen_random_uuid(),
  id_demande        uuid not null unique references demande(id_demande) on delete cascade,
  statut_regularite statut_regularite not null,
  score             numeric(6,2),
  rang_priorite     rang_priorite,
  parametres        jsonb not null default '{}'::jsonb,   -- instantané des poids/seuils utilisés
  est_simule        boolean not null default true,
  id_agent          uuid references agent(id_agent),
  horodatage        timestamptz not null default now()
);
create table controle_regularite (
  id_controle   uuid primary key default gen_random_uuid(),
  id_evaluation uuid not null references evaluation_individuelle(id_evaluation) on delete cascade,
  controle      text not null,                      -- identite, majorite, ayant_droit, non_cumul, ligne_mobile, campagne
  resultat      text not null,                      -- concluant / non_concluant / indisponible
  bloquant      boolean not null default true,
  source        text,
  detail        text,
  ordre         int not null default 0
);
create table score_dimension (
  id_dimension  uuid primary key default gen_random_uuid(),
  id_evaluation uuid not null references evaluation_individuelle(id_evaluation) on delete cascade,
  dimension     text not null,                      -- C1..C5
  libelle       text not null,
  valeur        numeric(4,3) not null,              -- 0..1
  poids         int not null,
  contribution  numeric(6,2) not null,              -- poids * valeur
  detail        text
);
create index idx_ctrl_eval on controle_regularite(id_evaluation);
create index idx_dim_eval  on score_dimension(id_evaluation);

alter table evaluation_individuelle enable row level security;
alter table controle_regularite     enable row level security;
alter table score_dimension          enable row level security;
create policy sel_eval  on evaluation_individuelle for select to authenticated using (is_active_agent());
create policy sel_ctrl  on controle_regularite     for select to authenticated using (is_active_agent());
create policy sel_dim   on score_dimension          for select to authenticated using (is_active_agent());

-- ---- Évalue une demande : régularité (bloquante) + score C1–C5 → rang P1–P4 ----
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
begin
  if not is_active_agent() then raise exception 'Accès refusé.'; end if;
  select * into d from demande where id_demande = p_id_demande;
  if d.id_demande is null then raise exception 'Demande introuvable.'; end if;
  select * into per from personne where id_personne = d.id_personne;
  select * into camp from campagne where id_campagne = d.id_campagne;

  h := abs(hashtext(p_id_demande::text)::bigint);
  ref_date := coalesce(d.date_soumission::date, current_date);
  v_age := extract(year from age(ref_date, per.date_naissance));
  seuil_inact := coalesce(param_num('seuil_inactivite_terminal_jours'),120);

  -- ================= CONTRÔLES DE RÉGULARITÉ (bloquants) =================
  -- 1. Identité (état civil, simulé via statut de vérification d'identité)
  r_ident := case per.statut_verif_identite
               when 'verifie' then 'concluant' when 'echec' then 'non_concluant' else 'indisponible' end;
  -- 2. Majorité (réel)
  r_major := case when v_age >= coalesce(param_num('age_minimum'),18) then 'concluant' else 'non_concluant' end;
  -- 3. Ayant droit social (RSU, simulé)
  r_rsu := case when (h/23 % 100) < 85 then 'concluant' when (h/23 % 100) < 95 then 'indisponible' else 'non_concluant' end;
  -- 4. Non-cumul (réel — RM-032 : pas d'attribution antérieure sur la période)
  r_cumul := case when exists (
      select 1 from distribution di join demande dm on dm.id_demande = di.id_demande
      where dm.id_personne = per.id_personne and di.id_demande <> p_id_demande
        and di.date_remise > now() - make_interval(months => coalesce(param_num('non_cumul_mois'),24)::int)
    ) then 'non_concluant' else 'concluant' end;
  -- 5. Ligne mobile (opérateur, simulé — titulaire concordant, ancienneté)
  r_ligne := case when (h/29 % 100) < 80 then 'concluant' when (h/29 % 100) < 92 then 'indisponible' else 'non_concluant' end;
  -- 6. Campagne (réel-ish : localité ouverte + quota disponible)
  v_quota_ok := camp.id_campagne is not null and camp.etat <> 'cloturee'
                and (select count(*) from demande dm where dm.id_campagne = camp.id_campagne and dm.etat = 'validee') < coalesce(camp.quota_total, 999999);
  r_camp := case when v_quota_ok then 'concluant' when camp.id_campagne is null then 'indisponible' else 'non_concluant' end;

  -- Verdict de régularité : un échec certain ⇒ refus ; une indisponibilité ⇒ à instruire ; sinon recevable.
  if 'non_concluant' in (r_ident,r_major,r_rsu,r_cumul,r_ligne,r_camp) then v_statut := 'refus';
  elsif 'indisponible' in (r_ident,r_major,r_rsu,r_cumul,r_ligne,r_camp) then v_statut := 'a_instruire';
  else v_statut := 'recevable'; end if;

  -- ================= SCORE INDIVIDUEL C1–C5 (jamais bloquant) =================
  p1 := coalesce(param_num('score_c1_poids'),30); p2 := coalesce(param_num('score_c2_poids'),25);
  p3 := coalesce(param_num('score_c3_poids'),20); p4 := coalesce(param_num('score_c4_poids'),15);
  p5 := coalesce(param_num('score_c5_poids'),10);
  s_p1 := coalesce(param_num('seuil_p1'),75); s_p2 := coalesce(param_num('seuil_p2'),55); s_p3 := coalesce(param_num('seuil_p3'),35);

  -- Signaux simulés déterministes (badge SIMULÉ) pour illustrer le moteur.
  techno := (array['2G','3G','4G'])[1 + (h % 3)];
  activite := (h/3 % 300);   -- jours depuis dernière activité de la ligne
  -- C1 : dispose-t-elle AUJOURD'HUI d'un smartphone perso fonctionnel et utilisé ?
  --      (déficit = besoin élevé). Dépend du seuil d'inactivité administrable.
  c1 := case techno when '4G' then 0.20 when '3G' then 0.50 else 0.85 end;
  if activite > seuil_inact then c1 := greatest(c1, 0.85); end if;   -- terminal inactif ⇒ non disponible
  c2 := round((0.40 + 0.55 * ((h/11 % 1000)::numeric/1000))::numeric, 3);   -- vulnérabilité socio-éco
  c3 := round((0.20 + 0.70 * ((h/13 % 1000)::numeric/1000))::numeric, 3);   -- accès autonome (dépendance)
  c4 := round((0.20 + 0.70 * ((h/17 % 1000)::numeric/1000))::numeric, 3);   -- accessibilité au marché
  c5 := round((0.55 * ((h/19 % 1000)::numeric/1000))::numeric, 3);          -- vulnérabilités spécifiques
  c1 := round(c1::numeric, 3);
  sc := p1*c1 + p2*c2 + p3*c3 + p4*c4 + p5*c5;   -- Σ poids = 100 ⇒ score ∈ [0,100]

  v_rang := case when v_statut <> 'recevable' then null
                 when sc >= s_p1 then 'P1' when sc >= s_p2 then 'P2' when sc >= s_p3 then 'P3' else 'P4' end;

  v_snap := param_snapshot(array['score_individuel','regularite']);

  -- ================= Écriture (remplace toute évaluation antérieure) =================
  delete from evaluation_individuelle where id_demande = p_id_demande;
  insert into evaluation_individuelle(id_demande, statut_regularite, score, rang_priorite, parametres, id_agent)
  values (p_id_demande, v_statut, case when v_statut='recevable' then round(sc,2) else null end, v_rang, v_snap, current_agent_id())
  returning * into v;

  insert into controle_regularite(id_evaluation, controle, resultat, source, detail, ordre) values
    (v.id_evaluation,'identite',    r_ident,'État civil','Pièce valide, titulaire vivant, absence d''usurpation',1),
    (v.id_evaluation,'majorite',    r_major,'Interne', v_age||' ans à la date de la demande',2),
    (v.id_evaluation,'ayant_droit', r_rsu,  'Registre social','Statut du ménage au regard des dispositifs sociaux',3),
    (v.id_evaluation,'non_cumul',   r_cumul,'Référentiel PASS','Absence d''attribution sur la période de non-cumul',4),
    (v.id_evaluation,'ligne_mobile',r_ligne,'Opérateur','Titulaire concordant, ancienneté minimale',5),
    (v.id_evaluation,'campagne',    r_camp, 'Interne','Localité ouverte, quota disponible',6);

  if v_statut = 'recevable' then
    insert into score_dimension(id_evaluation, dimension, libelle, valeur, poids, contribution, detail) values
      (v.id_evaluation,'C1','Disponibilité d''un smartphone personnel',c1,p1,round(p1*c1,2),'Ligne '||techno||', dernière activité il y a '||activite||' j (seuil '||seuil_inact||' j)'),
      (v.id_evaluation,'C2','Vulnérabilité socio-économique',c2,p2,round(p2*c2,2),'Proxy taux de pauvreté (simulé)'),
      (v.id_evaluation,'C3','Accès autonome au numérique',c3,p3,round(p3*c3,2),'Dépendance à un équipement partagé / un tiers (simulé)'),
      (v.id_evaluation,'C4','Accessibilité au marché',c4,p4,round(p4*c4,2),'Possibilité d''acheter / financer / réparer (simulé)'),
      (v.id_evaluation,'C5','Vulnérabilités spécifiques',c5,p5,round(p5*c5,2),'Vulnérabilités objectivement définies (simulé)');
  end if;

  -- Compat écrans historiques + affichage : on renseigne les colonnes de la demande.
  update demande set
    statut_regularite = v_statut,
    rang_priorite = v_rang,
    score_individuel = v.score,
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
