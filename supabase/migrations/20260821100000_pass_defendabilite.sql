-- ============================================================================
-- DÉFENDABILITÉ JURIDIQUE (Architecture ANSUT §3, §6.3, §8) — en base, SQL
-- portable (Azure Database for PostgreSQL). « PASS est d'abord un registre de
-- décisions défendable. » On implémente ici les garanties cœur de valeur :
--   §3.1  snapshot de décision auto-suffisant (rejeu sans système vivant)
--   §3.2  irréversible ≠ incorrigible : annulation append-only compensatoire
--   §6.3  quota dur atomique au commit (verrou FOR UPDATE)
--   §8    séparation des tâches à la remise + seuils de vélocité
-- ============================================================================

-- ============ §3.1 — Snapshot de décision immuable et auto-suffisant ============
create table decision_snapshot (
  id_snapshot uuid primary key default gen_random_uuid(),
  id_decision uuid not null unique references decision(id_decision),
  donnees     jsonb not null,        -- entrées utilisées, règles (version), réponses externes figées, résultat
  empreinte   text not null,         -- SHA-256 du contenu (inviolabilité vérifiable)
  horodatage  timestamptz not null default now()
);
alter table decision_snapshot enable row level security;
create policy sel_snapshot on decision_snapshot for select to authenticated using (is_active_agent());

create or replace function snapshot_decision() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_payload jsonb;
begin
  v_payload := jsonb_build_object(
    'decision', to_jsonb(new),
    'demande', (select to_jsonb(d) from demande d where d.id_demande = new.id_demande),
    'personne', (select jsonb_build_object('id_personne',p.id_personne,'nom',p.nom,'prenoms',p.prenoms,
                    'numero_cni',p.numero_cni,'nni',p.nni,'date_naissance',p.date_naissance,
                    'zone_residence',p.zone_residence,'statut_verif_identite',p.statut_verif_identite)
                 from personne p join demande dm on dm.id_personne = p.id_personne where dm.id_demande = new.id_demande),
    'evaluation', (select to_jsonb(e) from evaluation_individuelle e where e.id_demande = new.id_demande),
    'controles_regularite', (select jsonb_agg(to_jsonb(c) order by c.ordre)
                 from controle_regularite c join evaluation_individuelle e on e.id_evaluation = c.id_evaluation
                 where e.id_demande = new.id_demande),
    'reponses_externes_figees', (select jsonb_agg(to_jsonb(vf)) from verification vf where vf.id_demande = new.id_demande),
    'regles_version', param_snapshot(array['score_individuel','regularite','sources','ciblage_geo']),
    'resultat', new.sens,
    'horodatage_decision', new.horodatage
  );
  insert into decision_snapshot(id_decision, donnees, empreinte)
  values (new.id_decision, v_payload, encode(sha256(convert_to(v_payload::text,'UTF8')),'hex'));
  return new;
end;
$$;
create trigger trg_snapshot_decision after insert on decision
  for each row execute function snapshot_decision();

-- Snapshot immuable : ni modification ni suppression.
create or replace function _no_mutation() returns trigger language plpgsql as $$
begin raise exception 'Écriture immuable : mise à jour et suppression interdites (auditabilité).'; end; $$;
create trigger trg_snapshot_immuable before update or delete on decision_snapshot
  for each row execute function _no_mutation();

-- ============ §3.2 — Annulation append-only (compensation tracée) ============
-- « Irréversible » interdit la MUTATION de l'écriture d'origine, pas l'ajout
-- d'un enregistrement d'annulation lié. L'annulation est elle-même une décision
-- auditée (qui, sur quelle base, avec quelle autorisation).
create table annulation (
  id_annulation uuid primary key default gen_random_uuid(),
  cible_type    text not null check (cible_type in ('decision','distribution')),
  id_cible      uuid not null,
  motif         text not null,
  autorisation  text not null,          -- base légale / autorisation
  snapshot      jsonb not null,         -- snapshot auditable de l'annulation
  empreinte     text not null,
  id_agent      uuid not null references agent(id_agent),
  horodatage    timestamptz not null default now()
);
alter table annulation enable row level security;
create policy sel_annulation on annulation for select to authenticated using (is_active_agent());
create trigger trg_annulation_immuable before update or delete on annulation
  for each row execute function _no_mutation();

create or replace function pass_annuler_decision(p_id_decision uuid, p_motif text, p_autorisation text)
returns annulation language plpgsql security definer set search_path = public as $$
declare v annulation; v_dec decision; v_dist distribution; v_payload jsonb;
begin
  if current_agent_role() <> 'superviseur' then raise exception 'Accès refusé : annulation réservée au superviseur.'; end if;
  if coalesce(trim(p_motif),'') = '' then raise exception 'Motif obligatoire.'; end if;
  if coalesce(trim(p_autorisation),'') = '' then raise exception 'Autorisation obligatoire (base légale / hiérarchie).'; end if;
  select * into v_dec from decision where id_decision = p_id_decision;
  if v_dec.id_decision is null then raise exception 'Décision introuvable.'; end if;
  if exists (select 1 from annulation where cible_type='decision' and id_cible=p_id_decision) then
    raise exception 'Cette décision est déjà annulée.'; end if;

  select * into v_dist from distribution where id_demande = v_dec.id_demande limit 1;
  v_payload := jsonb_build_object(
    'decision_annulee', to_jsonb(v_dec),
    'snapshot_origine', (select donnees from decision_snapshot where id_decision = p_id_decision),
    'annulee_par', current_agent_id(), 'role', current_agent_role(),
    'motif', p_motif, 'autorisation', p_autorisation, 'horodatage', now(),
    'distribution_liee', to_jsonb(v_dist));
  insert into annulation(cible_type, id_cible, motif, autorisation, snapshot, empreinte, id_agent)
  values ('decision', p_id_decision, p_motif, p_autorisation, v_payload,
          encode(sha256(convert_to(v_payload::text,'UTF8')),'hex'), current_agent_id())
  returning * into v;

  -- Compensation (jamais de mutation de la décision d'origine) :
  -- le dossier redevient instruisible ; le quota se libère (voir check_quota).
  update demande set etat = 'a_instruire' where id_demande = v_dec.id_demande;
  -- Terminal éventuellement remis : récupéré en stock.
  if v_dist.id_terminal is not null then
    update terminal set statut = 'en_stock', id_personne = null where id_terminal = v_dist.id_terminal;
  end if;
  perform _log('ANNULATION décision ('||p_motif||' · autorisation: '||p_autorisation||')', 'decision', p_id_decision::text);
  return v;
end;
$$;
grant execute on function pass_annuler_decision(uuid, text, text) to authenticated;

-- ============ §6.3 — Quota dur atomique (verrou FOR UPDATE) + exclusion des annulées ============
create or replace function check_quota() returns trigger
language plpgsql set search_path = public as $$
declare v_campagne uuid; v_quota int; v_valides int;
begin
  if new.sens = 'validee' then
    select id_campagne into v_campagne from demande where id_demande = new.id_demande;
    -- Verrou sur la campagne : sérialise la course au dernier créneau (§6.3).
    perform 1 from campagne where id_campagne = v_campagne for update;
    select quota_total into v_quota from campagne where id_campagne = v_campagne;
    select count(*) into v_valides
    from decision dec join demande dm on dm.id_demande = dec.id_demande
    where dm.id_campagne = v_campagne and dec.sens = 'validee'
      and not exists (select 1 from annulation a where a.cible_type='decision' and a.id_cible = dec.id_decision);
    if v_valides >= v_quota then
      raise exception 'Quota de campagne atteint (% attributions) : validation impossible (RM-034).', v_quota;
    end if;
  end if;
  return new;
end;
$$;

-- ============ §8 — Séparation des tâches à la remise (l'enrôleur ≠ le remettant) ============
create or replace function check_separation_taches() returns trigger
language plpgsql set search_path = public as $$
declare v_enroleur uuid;
begin
  select id_agent into v_enroleur from demande where id_demande = new.id_demande;
  if v_enroleur is not null and v_enroleur = new.id_agent then
    raise exception 'Séparation des tâches : l''agent qui a enrôlé ne peut pas effectuer la remise (Architecture §8).';
  end if;
  return new;
end;
$$;
create trigger trg_separation_taches before insert on distribution
  for each row execute function check_separation_taches();

-- Seuils de vélocité (§8) : remises par agent et par jour (alerte SQL simple).
create or replace view v_velocite_remise as
select a.id_agent, a.identite, date_trunc('day', di.date_remise)::date as jour, count(*) as nb_remises
from distribution di join agent a on a.id_agent = di.id_agent
group by 1,2,3;
grant select on v_velocite_remise to authenticated;

insert into parametre(cle, libelle, groupe, type, unite, arrete, description) values
  ('seuil_velocite_remises_jour','Seuil d''alerte — remises par agent et par jour','regularite','entier','/jour',false,
   'Au-delà, alerte de supervision (Architecture §8).')
on conflict (cle) do nothing;
insert into parametre_version(cle, valeur, actif, motif) values
  ('seuil_velocite_remises_jour','30',true,'Valeur indicative initiale')
on conflict do nothing;
