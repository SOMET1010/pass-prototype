-- ============================================================================
-- REGISTRE DE PARAMÈTRES ADMINISTRABLES (CDC Éligibilité v3, § 6)
-- « Une part des règles n'est pas encore arrêtée : seuils, poids, clés. Ces
--  éléments doivent être des paramètres administrables, jamais des valeurs
--  inscrites dans le code. Un changement doit se faire par configuration, sans
--  redéploiement. » — chaque modification est horodatée, attribuée, versionnée ;
--  le jeu de paramètres en vigueur est conservable pour la reproductibilité.
-- ============================================================================

create table parametre (
  cle         text primary key,               -- ex. score_c1_poids, seuil_p1
  libelle     text not null,
  groupe      text not null,                   -- score_individuel, regularite, ciblage_geo, sources
  type        text not null,                   -- entier, decimal, pourcentage, duree_jours, duree_mois, booleen, choix
  unite       text,
  arrete      boolean not null default false,  -- la valeur est-elle officiellement arrêtée ?
  description text
);

create table parametre_version (
  id_version  uuid primary key default gen_random_uuid(),
  cle         text not null references parametre(cle),
  valeur      text not null,
  actif       boolean not null default true,
  horodatage  timestamptz not null default now(),
  id_agent    uuid references agent(id_agent),
  motif       text
);
-- une seule version active par paramètre
create unique index uq_param_actif on parametre_version(cle) where actif;
create index idx_param_version_cle on parametre_version(cle, horodatage desc);

alter table parametre         enable row level security;
alter table parametre_version enable row level security;
create policy sel_parametre         on parametre         for select to authenticated using (is_active_agent());
create policy sel_parametre_version on parametre_version for select to authenticated using (is_active_agent());

-- Valeur active d'un paramètre (texte / numérique).
create or replace function param_txt(p_cle text) returns text
language sql stable security definer set search_path = public as $$
  select valeur from parametre_version where cle = p_cle and actif limit 1;
$$;
create or replace function param_num(p_cle text) returns numeric
language sql stable security definer set search_path = public as $$
  select nullif(regexp_replace(param_txt(p_cle), '[^0-9.\-]', '', 'g'), '')::numeric;
$$;

-- Instantané des paramètres actifs d'un ou plusieurs groupes (pour archivage/reproductibilité).
create or replace function param_snapshot(p_groupes text[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(pv.cle, pv.valeur), '{}'::jsonb)
  from parametre_version pv join parametre p on p.cle = pv.cle
  where pv.actif and p.groupe = any(p_groupes);
$$;

-- Vue lisible : paramètre + valeur active + qui/quand.
create or replace view v_parametres as
select p.cle, p.libelle, p.groupe, p.type, p.unite, p.arrete, p.description,
       pv.valeur, pv.horodatage as maj_le, pv.id_agent as maj_par, pv.motif
from parametre p
left join parametre_version pv on pv.cle = p.cle and pv.actif
order by p.groupe, p.cle;
grant select on v_parametres to authenticated;

-- ---- Modifier un paramètre (nouvelle version active, ancienne archivée) ----
create or replace function pass_param_maj(p_cle text, p_valeur text, p_motif text)
returns parametre_version language plpgsql security definer set search_path = public as $$
declare v parametre_version;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  if not exists (select 1 from parametre where cle = p_cle) then raise exception 'Paramètre inconnu : %', p_cle; end if;
  update parametre_version set actif = false where cle = p_cle and actif;
  insert into parametre_version(cle, valeur, actif, id_agent, motif)
  values (p_cle, p_valeur, true, current_agent_id(), p_motif) returning * into v;
  perform _log('paramètre ' || p_cle || ' = ' || p_valeur, 'parametre', p_cle);
  return v;
end;
$$;
grant execute on function pass_param_maj(text, text, text) to authenticated;

-- ---- Seed des paramètres du CDC v3 (valeurs indicatives, la plupart NON arrêtées) ----
insert into parametre(cle, libelle, groupe, type, unite, arrete, description) values
  ('score_c1_poids','Poids C1 — disponibilité d''un smartphone personnel','score_individuel','entier',null,false,'Somme des poids C1..C5 = 100. Non arrêté (CDC v3 §3.2).'),
  ('score_c2_poids','Poids C2 — vulnérabilité socio-économique','score_individuel','entier',null,false,'Non arrêté.'),
  ('score_c3_poids','Poids C3 — accès autonome au numérique','score_individuel','entier',null,false,'Non arrêté.'),
  ('score_c4_poids','Poids C4 — accessibilité au marché','score_individuel','entier',null,false,'Non arrêté.'),
  ('score_c5_poids','Poids C5 — vulnérabilités spécifiques','score_individuel','entier',null,false,'Non arrêté.'),
  ('seuil_p1','Seuil de priorité P1 (très élevée)','score_individuel','entier','/100',false,'Score ≥ seuil ⇒ P1. Non arrêté (CDC v3 §3.3).'),
  ('seuil_p2','Seuil de priorité P2 (élevée)','score_individuel','entier','/100',false,'Non arrêté.'),
  ('seuil_p3','Seuil de priorité P3 (normale)','score_individuel','entier','/100',false,'En dessous ⇒ P4 (faible). Non arrêté.'),
  ('seuil_inactivite_terminal_jours','Seuil d''inactivité d''un terminal (C1)','score_individuel','duree_jours','jours',false,'Au-delà, le terminal n''est plus réputé disponible. Hypothèse CDC : 4 mois.'),
  ('age_minimum','Âge minimum du bénéficiaire','regularite','entier','ans',true,'18 ans révolus à la date de la demande (CDC v3 §3.1).'),
  ('non_cumul_mois','Période de non-cumul','regularite','duree_mois','mois',false,'Non arrêté (décision C-x).'),
  ('anciennete_ligne_mois','Ancienneté minimale de la ligne mobile','regularite','duree_mois','mois',false,'Non arrêté.'),
  ('delai_max_source_sec','Délai maximal d''interrogation d''une source','sources','duree_sec','s',false,'Au-delà ⇒ à_instruire. À calibrer (CDC v3 §4.2).')
on conflict (cle) do nothing;

-- Valeurs initiales actives (indicatives). arrete=false ⇒ à confirmer par décision.
insert into parametre_version(cle, valeur, actif, motif) values
  ('score_c1_poids','30',true,'Valeur indicative initiale'),
  ('score_c2_poids','25',true,'Valeur indicative initiale'),
  ('score_c3_poids','20',true,'Valeur indicative initiale'),
  ('score_c4_poids','15',true,'Valeur indicative initiale'),
  ('score_c5_poids','10',true,'Valeur indicative initiale'),
  ('seuil_p1','75',true,'Valeur indicative initiale'),
  ('seuil_p2','55',true,'Valeur indicative initiale'),
  ('seuil_p3','35',true,'Valeur indicative initiale'),
  ('seuil_inactivite_terminal_jours','120',true,'Hypothèse CDC : 4 mois'),
  ('age_minimum','18',true,'CDC v3'),
  ('non_cumul_mois','24',true,'Valeur indicative initiale'),
  ('anciennete_ligne_mois','3',true,'Valeur indicative initiale'),
  ('delai_max_source_sec','8',true,'Valeur indicative initiale')
on conflict do nothing;
