-- PASS prototype — schéma de base (10 tables) avec contraintes en base
-- Toutes les contraintes UNIQUE / NOT NULL / FK / composites sont posées ici,
-- de sorte qu'aucun appel direct à l'API ne puisse les contourner.

create extension if not exists pgcrypto;

-- ============ ENUMS ============
create type statut_verif_identite as enum ('non_verifie', 'verifie', 'echec');
create type campagne_etat as enum ('preparee', 'ouverte', 'cloturee');
create type demande_canal as enum ('autonome', 'assiste');
create type demande_etat as enum ('brouillon', 'soumise', 'a_instruire', 'validee', 'refusee');
create type demande_recommandation as enum ('eligible', 'non_eligible', 'a_instruire');
create type verification_source as enum ('oneci', 'rsu', 'operateur', 'imei', 'historique');
create type verification_resultat as enum ('concluant', 'non_concluant', 'indisponible');
create type decision_sens as enum ('validee', 'refusee');
create type agent_role as enum ('enrolement', 'instructeur', 'remise', 'superviseur');
create type agent_statut as enum ('actif', 'suspendu');
create type terminal_statut as enum ('en_stock', 'remis', 'perdu', 'bloque');
create type distribution_activation as enum ('non_active', 'active');
create type consentement_moyen as enum ('signature', 'assiste_temoin', 'otp');

-- ============ AGENT ============ (utilisateur habilité, lié à auth.users)
create table agent (
  id_agent    uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users(id) on delete set null,
  identite    text not null,
  role        agent_role not null,
  statut      agent_statut not null default 'actif'
);

-- ============ PERSONNE ============
create table personne (
  id_personne             uuid primary key default gen_random_uuid(),
  numero_cni              text not null unique,               -- RM-004
  nom                     text not null,
  prenoms                 text not null,
  date_naissance          date not null,
  zone_residence          text not null,
  photo_url               text,
  statut_verif_identite   statut_verif_identite not null default 'non_verifie',
  -- profil_demo : données fictives qui pilotent les vérifications SIMULÉES du prototype
  -- (réponses attendues des référentiels ONECI/RSU/opérateur). Aucune donnée réelle.
  profil_demo             jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now()
);

-- ============ CAMPAGNE ============
create table campagne (
  id_campagne      uuid primary key default gen_random_uuid(),
  libelle          text not null,
  date_debut       date not null,
  date_fin         date not null,
  zones_couvertes  text[] not null default '{}',
  quota_total      int not null check (quota_total >= 0),
  etat             campagne_etat not null default 'preparee'
);

-- ============ DEMANDE ============
create table demande (
  id_demande         uuid primary key default gen_random_uuid(),
  numero_dossier     text not null unique,                    -- RM-069 (généré par trigger)
  id_personne        uuid not null references personne(id_personne),
  id_campagne        uuid not null references campagne(id_campagne),
  canal              demande_canal not null default 'assiste',
  id_agent           uuid references agent(id_agent),
  etat               demande_etat not null default 'brouillon',
  recommandation     demande_recommandation,
  consentement       boolean not null default false,          -- RM-184
  consentement_moyen consentement_moyen,                       -- RM-185
  date_soumission    timestamptz,
  created_at         timestamptz not null default now(),
  constraint uq_demande_personne_campagne unique (id_personne, id_campagne)  -- une demande active / personne / campagne
);

-- ============ VERIFICATION ============
create table verification (
  id_verification uuid primary key default gen_random_uuid(),
  id_demande      uuid not null references demande(id_demande) on delete cascade,
  source          verification_source not null,
  resultat        verification_resultat not null,
  est_simule      boolean not null default true,              -- badge SIMULÉ
  donnees_retour  jsonb,
  horodatage      timestamptz not null default now()
);

-- ============ DECISION ============ (RM-092 : une seule, irréversible)
create table decision (
  id_decision uuid primary key default gen_random_uuid(),
  id_demande  uuid not null unique references demande(id_demande),
  sens        decision_sens not null,
  motif       text,
  id_agent    uuid not null references agent(id_agent),
  horodatage  timestamptz not null default now(),
  -- RM-099 : motif obligatoire si refus
  constraint chk_motif_si_refus check (
    sens = 'validee' or (sens = 'refusee' and motif is not null and length(trim(motif)) > 0)
  )
);

-- ============ TERMINAL ============
create table terminal (
  id_terminal uuid primary key default gen_random_uuid(),
  modele      text not null,
  imei        text not null unique,                           -- RM-111
  id_personne uuid references personne(id_personne),
  statut      terminal_statut not null default 'en_stock'
);

-- ============ DISTRIBUTION ============
create table distribution (
  id_distribution   uuid primary key default gen_random_uuid(),
  id_demande        uuid not null unique references demande(id_demande),   -- RM-097 (1 remise / demande)
  id_terminal       uuid not null unique references terminal(id_terminal), -- RM-097 (1 remise / terminal)
  id_agent          uuid not null references agent(id_agent),
  point_remise      text not null,
  date_remise       timestamptz not null default now(),
  statut_activation distribution_activation not null default 'non_active'
);

-- ============ PREUVE_REMISE ============ (RM-181)
create table preuve_remise (
  id_preuve       uuid primary key default gen_random_uuid(),
  id_distribution uuid not null unique references distribution(id_distribution),
  photo_url       text,
  geolocalisation text,                                       -- simulée
  horodatage      timestamptz not null default now(),
  id_agent        uuid not null references agent(id_agent),
  est_simule      boolean not null default true
);

-- ============ JOURNAL_AUDIT ============ (RM-151, append-only)
create table journal_audit (
  id_evenement uuid primary key default gen_random_uuid(),
  acteur       text not null,
  action       text not null,
  cible_type   text,
  cible_id     text,
  horodatage   timestamptz not null default now()
);

create index idx_demande_campagne on demande(id_campagne);
create index idx_demande_personne on demande(id_personne);
create index idx_verification_demande on verification(id_demande);
create index idx_terminal_statut on terminal(statut);
create index idx_journal_horodatage on journal_audit(horodatage desc);
