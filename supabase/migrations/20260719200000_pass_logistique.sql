-- ============================================================================
-- MODULE LOGISTIQUE — chaîne d'approvisionnement amont du Programme d'Accès aux
-- Smartphones Subventionnés : du fournisseur jusqu'au point PASS (fixe ou mobile).
--
--   Fournisseur → arrivage + liste de colisage → réception des colis (scan
--   QR/code-barre) → contrôle des écarts → entrée en entrepôt (rangement par
--   emplacement) → transfert (bon de sortie) vers un point PASS fixe ou vers un
--   point PASS mobile (ouverture de campagne) → paramétrage de l'équipe + géo-
--   localisation → mission → rapport de mission → état du stock à chaque niveau.
--
-- Traçabilité par IMEI : chaque terminal est rattaché à son colis, son
-- fournisseur et son emplacement, et chaque déplacement est journalisé dans
-- mouvement_stock. Toutes les écritures passent par des fonctions SECURITY
-- DEFINER nommées et auditées — non contournables par appel direct à l'API.
-- ============================================================================

-- ============ ENUMS ============
create type arrivage_statut  as enum ('attendu','en_reception','receptionne','cloture');
create type colis_statut     as enum ('attendu','recu','ecart','range');
create type point_type       as enum ('fixe','mobile');
create type point_statut     as enum ('actif','inactif','en_mission');
create type mission_statut   as enum ('preparee','en_cours','cloturee');
create type mouvement_type   as enum ('reception','rangement','transfert','remise','retour','ajustement');

-- ============ FOURNISSEUR ============
create table fournisseur (
  id_fournisseur uuid primary key default gen_random_uuid(),
  raison_sociale text not null,
  pays           text not null default 'International',
  contact_email  text,
  contact_tel    text,
  actif          boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ============ ENTREPÔT & EMPLACEMENTS ============
create table entrepot (
  id_entrepot uuid primary key default gen_random_uuid(),
  libelle     text not null,
  zone        text not null,
  adresse     text
);
create table emplacement (
  id_emplacement uuid primary key default gen_random_uuid(),
  id_entrepot    uuid not null references entrepot(id_entrepot),
  code           text not null,                 -- ex. A-01-03 (allée-travée-niveau)
  description    text,
  constraint uq_emplacement unique (id_entrepot, code)
);

-- ============ ARRIVAGE (expédition) + LISTE DE COLISAGE ============
create table arrivage (
  id_arrivage    uuid primary key default gen_random_uuid(),
  reference      text not null unique,           -- n° d'expédition / BL
  id_fournisseur uuid not null references fournisseur(id_fournisseur),
  date_prevue    date,
  date_reception timestamptz,
  statut         arrivage_statut not null default 'attendu',
  note           text,
  created_at     timestamptz not null default now()
);
create table colisage_ligne (
  id_ligne          uuid primary key default gen_random_uuid(),
  id_arrivage       uuid not null references arrivage(id_arrivage) on delete cascade,
  modele            text not null,
  quantite_attendue int not null check (quantite_attendue > 0),
  imei_debut        text,                          -- plage IMEI (numérique, en texte)
  imei_fin          text
);

-- ============ COLIS (carton physique scannable) ============
create table colis (
  id_colis          uuid primary key default gen_random_uuid(),
  id_arrivage       uuid not null references arrivage(id_arrivage) on delete cascade,
  id_ligne          uuid references colisage_ligne(id_ligne),
  code_barre        text not null unique,          -- QR / code-barre de la boîte
  modele            text not null,
  quantite_attendue int not null check (quantite_attendue > 0),
  quantite_recue    int,
  imei_debut        text,
  imei_fin          text,
  statut            colis_statut not null default 'attendu',
  id_emplacement    uuid references emplacement(id_emplacement),
  ecart             int not null default 0,        -- reçu - attendu
  horodatage_recu   timestamptz
);
create index idx_colis_arrivage on colis(id_arrivage);
create index idx_colis_statut on colis(statut);

-- ============ EXTENSIONS point_retrait & terminal ============
alter table point_retrait add column type_point point_type   not null default 'fixe';
alter table point_retrait add column statut_point point_statut not null default 'actif';
alter table point_retrait add column latitude  double precision;
alter table point_retrait add column longitude double precision;
alter table point_retrait add column id_campagne uuid references campagne(id_campagne);

alter table terminal add column id_colis       uuid references colis(id_colis);
alter table terminal add column id_fournisseur uuid references fournisseur(id_fournisseur);
alter table terminal add column id_emplacement uuid references emplacement(id_emplacement);
alter table terminal add column date_entree    timestamptz;

-- ============ ÉQUIPE (point mobile) ============
create table equipe (
  id_equipe       uuid primary key default gen_random_uuid(),
  libelle         text not null,
  id_point_retrait uuid references point_retrait(id_point),
  vehicule        text,
  zone            text,
  created_at      timestamptz not null default now()
);
create table equipe_membre (
  id_membre   uuid primary key default gen_random_uuid(),
  id_equipe   uuid not null references equipe(id_equipe) on delete cascade,
  id_agent    uuid not null references agent(id_agent),
  role_terrain text not null default 'agent',       -- chef / agent / logisticien
  constraint uq_equipe_membre unique (id_equipe, id_agent)
);

-- ============ MISSION (déploiement d'un point mobile) + RAPPORT ============
create table mission (
  id_mission       uuid primary key default gen_random_uuid(),
  reference        text not null unique,
  id_point_retrait uuid not null references point_retrait(id_point),
  id_campagne      uuid references campagne(id_campagne),
  date_debut       timestamptz,
  date_fin         timestamptz,
  statut           mission_statut not null default 'preparee',
  latitude         double precision,
  longitude        double precision,
  created_at       timestamptz not null default now()
);
create table rapport_mission (
  id_rapport   uuid primary key default gen_random_uuid(),
  id_mission   uuid not null references mission(id_mission),
  distribues   int not null default 0,
  retours      int not null default 0,
  stock_restant int not null default 0,
  incidents    text,
  observations text,
  id_agent     uuid not null references agent(id_agent),
  latitude     double precision,
  longitude    double precision,
  horodatage   timestamptz not null default now()
);

-- ============ BON DE TRANSFERT (sortie) ============
create table bon_transfert (
  id_bon        uuid primary key default gen_random_uuid(),
  reference     text not null unique,
  origine_type  text not null default 'entrepot',   -- entrepot / point
  id_entrepot   uuid references entrepot(id_entrepot),
  id_point_src  uuid references point_retrait(id_point),
  id_point_dest uuid not null references point_retrait(id_point),
  modele        text,
  quantite      int not null check (quantite > 0),
  id_agent      uuid not null references agent(id_agent),
  horodatage    timestamptz not null default now()
);

-- ============ MOUVEMENT_STOCK (journal central) ============
create table mouvement_stock (
  id_mouvement uuid primary key default gen_random_uuid(),
  type_mvt     mouvement_type not null,
  id_terminal  uuid references terminal(id_terminal),
  id_colis     uuid references colis(id_colis),
  quantite     int not null default 1,
  origine      text,
  destination  text,
  reference    text,
  id_agent     uuid references agent(id_agent),
  horodatage   timestamptz not null default now()
);
create index idx_mouvement_horodatage on mouvement_stock(horodatage desc);
create index idx_mouvement_type on mouvement_stock(type_mvt);

-- ============ RLS : lecture pour agents actifs, écriture via RPC seulement ============
alter table fournisseur      enable row level security;
alter table entrepot         enable row level security;
alter table emplacement      enable row level security;
alter table arrivage         enable row level security;
alter table colisage_ligne   enable row level security;
alter table colis            enable row level security;
alter table equipe           enable row level security;
alter table equipe_membre    enable row level security;
alter table mission          enable row level security;
alter table rapport_mission  enable row level security;
alter table bon_transfert    enable row level security;
alter table mouvement_stock  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fournisseur','entrepot','emplacement','arrivage','colisage_ligne','colis',
                           'equipe','equipe_membre','mission','rapport_mission','bon_transfert','mouvement_stock']
  loop
    execute format('create policy sel_%1$s on %1$s for select to authenticated using (is_active_agent());', t);
  end loop;
end $$;

-- Vue : état du stock consolidé par emplacement / point
create or replace view v_stock_logistique as
select
  coalesce(pr.libelle, e.libelle, 'Entrepôt') as lieu,
  case when t.id_point_retrait is not null then 'point' else 'entrepot' end as niveau,
  t.modele,
  count(*) filter (where t.statut = 'en_stock') as en_stock,
  count(*) filter (where t.statut = 'remis') as remis
from terminal t
left join point_retrait pr on pr.id_point = t.id_point_retrait
left join emplacement em on em.id_emplacement = t.id_emplacement
left join entrepot e on e.id_entrepot = em.id_entrepot
group by 1,2,3;
grant select on v_stock_logistique to authenticated;
