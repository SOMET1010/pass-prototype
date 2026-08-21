-- Modes d'accès aux bases externes (CDC v3 §4). Mode configurable par source ;
-- le mode « déclaratif » (dégradé) produit systématiquement « à instruire ».
create type mode_source as enum ('fichier','service','declaratif');
create table source_externe (
  code text primary key, libelle text not null,
  mode mode_source not null default 'service', delai_max_sec int not null default 8,
  actif boolean not null default true, champs jsonb not null default '[]'::jsonb, description text
);
alter table source_externe enable row level security;
create policy sel_source on source_externe for select to authenticated using (is_active_agent());

insert into source_externe(code, libelle, mode, delai_max_sec, champs, description) values
  ('etat_civil','État civil (ONECI)','service',8,
   '[{"champ":"nom_officiel","regle":"contrôle Identité"},{"champ":"date_naissance","regle":"contrôle Majorité"},{"champ":"statut_vital","regle":"contrôle Identité"}]',
   'Identité : pièce valide, titulaire vivant, absence d''usurpation.'),
  ('rsu','Registre social unique','fichier',8,
   '[{"champ":"statut_menage","regle":"contrôle Ayant droit"},{"champ":"score_social","regle":"contrôle Ayant droit"}]',
   'Ayant droit social : statut du ménage au regard des dispositifs sociaux.'),
  ('operateur','Opérateurs mobiles','service',6,
   '[{"champ":"titulaire","regle":"contrôle Ligne mobile"},{"champ":"anciennete_ligne","regle":"contrôle Ligne mobile"},{"champ":"techno_terminal","regle":"score C1"},{"champ":"date_derniere_activite","regle":"score C1"}]',
   'Ligne mobile : titulaire concordant, ancienneté ; alimente aussi C1.'),
  ('registre_imei','Registre IMEI','service',6,
   '[{"champ":"imei_signale","regle":"contrôle terminal"}]','Terminal non signalé volé/bloqué.'),
  ('historique','Historique PASS','fichier',5,
   '[{"champ":"attributions_anterieures","regle":"contrôle Non-cumul"}]','Non-cumul : attributions antérieures.')
on conflict (code) do nothing;

create or replace function source_mode(p_code text) returns text
language sql stable security definer set search_path = public as $$
  select mode::text from source_externe where code = p_code and actif;
$$;

insert into parametre(cle, libelle, groupe, type, unite, arrete, description) values
  ('nni_obligatoire','NNI obligatoire à la souscription','sources','booleen',null,false,
   'Optionnel devenant obligatoire par configuration (CDC v3 §4.3).')
on conflict (cle) do nothing;
insert into parametre_version(cle, valeur, actif, motif) values ('nni_obligatoire','false',true,'Non arrêté')
on conflict do nothing;
