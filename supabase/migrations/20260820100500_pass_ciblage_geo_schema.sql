-- Ciblage géographique (CDC v3 §2) — référentiel des localités + tables d'exécution.
-- Jointure entre référentiels PAR COORDONNÉES uniquement (les noms produisent des faux positifs).
create table localite (
  identifiant_localite text primary key,
  nom text not null, region text not null, departement text, sous_prefecture text,
  latitude double precision, longitude double precision,
  population int not null default 0,
  taux_pauvrete numeric(4,3) not null default 0,
  taux_possession numeric(4,3) not null default 0,
  part_femmes_jeunes numeric(4,3) not null default 0,
  rural boolean not null default true,
  distance_site_km numeric(6,1) not null default 0,
  couverture_2g boolean not null default true,
  couverture_3g boolean not null default false,
  couverture_4g boolean not null default false,
  electrifiee boolean not null default false,
  point_recharge boolean not null default false,
  point_remise_id uuid references point_retrait(id_point)
);
create table ciblage_geo (
  id_ciblage uuid primary key default gen_random_uuid(),
  id_campagne uuid references campagne(id_campagne),
  volume_total int not null, volume_score int not null, volume_reserve int not null,
  parametres jsonb not null default '{}'::jsonb,
  id_agent uuid references agent(id_agent), horodatage timestamptz not null default now()
);
create table ciblage_localite (
  id_ligne uuid primary key default gen_random_uuid(),
  id_ciblage uuid not null references ciblage_geo(id_ciblage) on delete cascade,
  identifiant_localite text not null references localite(identifiant_localite),
  retenue boolean not null, motif_exclusion text,
  score numeric(6,2), population_eligible int,
  quota_score int not null default 0, quota_reserve int not null default 0, quota_total int not null default 0
);
create index idx_cl_ciblage on ciblage_localite(id_ciblage);
create table arbitrage_reserve (
  id_arbitrage uuid primary key default gen_random_uuid(),
  id_ciblage uuid not null references ciblage_geo(id_ciblage) on delete cascade,
  identifiant_localite text not null references localite(identifiant_localite),
  quantite int not null check (quantite > 0),
  motif text not null, id_agent uuid not null references agent(id_agent),
  horodatage timestamptz not null default now()
);
alter table localite enable row level security;
alter table ciblage_geo enable row level security;
alter table ciblage_localite enable row level security;
alter table arbitrage_reserve enable row level security;
create policy sel_localite on localite for select to authenticated using (is_active_agent());
create policy sel_ciblage on ciblage_geo for select to authenticated using (is_active_agent());
create policy sel_ciblage_loc on ciblage_localite for select to authenticated using (is_active_agent());
create policy sel_arbitrage on arbitrage_reserve for select to authenticated using (is_active_agent());

insert into parametre(cle, libelle, groupe, type, unite, arrete, description) values
  ('score_geo_deficit','Poids — déficit d''équipement','ciblage_geo','entier',null,false,'Écart au taux national de possession. Somme des 5 poids = 100 (CDC §2.3).'),
  ('score_geo_pauvrete','Poids — pauvreté','ciblage_geo','entier',null,false,'Taux de pauvreté du département.'),
  ('score_geo_ruralite','Poids — ruralité et isolement','ciblage_geo','entier',null,false,'Caractère rural et éloignement.'),
  ('score_geo_femmes_jeunes','Poids — femmes et jeunes','ciblage_geo','entier',null,false,'Part dans la population adulte.'),
  ('score_geo_logistique','Poids — efficacité logistique','ciblage_geo','entier',null,false,'Densité et coût d''acheminement.'),
  ('cle_score_reserve_pct','Clé score / réserve d''arbitrage','ciblage_geo','pourcentage','%',false,'Défaut 75 ; orientation revue 18 août : 80 (décision C-2 non arrêtée).'),
  ('plafond_localite_pct','Plafond de concentration par localité','ciblage_geo','pourcentage','%',false,'Part maximale du volume par localité.'),
  ('plancher_localite','Plancher par localité retenue','ciblage_geo','entier','terminaux',false,'Quota minimal d''une localité retenue.'),
  ('taux_possession_national','Taux national de possession de smartphone','ciblage_geo','decimal',null,false,'Référence pour le déficit d''équipement.')
on conflict (cle) do nothing;
insert into parametre_version(cle, valeur, actif, motif) values
  ('score_geo_deficit','30',true,'CDC §2.3 (indicatif)'),('score_geo_pauvrete','25',true,'CDC §2.3 (indicatif)'),
  ('score_geo_ruralite','20',true,'CDC §2.3 (indicatif)'),('score_geo_femmes_jeunes','15',true,'CDC §2.3 (indicatif)'),
  ('score_geo_logistique','10',true,'CDC §2.3 (indicatif)'),('cle_score_reserve_pct','75',true,'Valeur par défaut CDC'),
  ('plafond_localite_pct','25',true,'Valeur indicative initiale'),('plancher_localite','5',true,'Valeur indicative initiale'),
  ('taux_possession_national','0.45',true,'Valeur indicative initiale')
on conflict do nothing;
