-- ============ Génération du numéro de dossier (RM-069) ============
create sequence if not exists demande_dossier_seq;

create or replace function gen_numero_dossier() returns trigger
language plpgsql as $$
begin
  if new.numero_dossier is null or new.numero_dossier = '' then
    new.numero_dossier := 'PASS-2026-' || lpad(nextval('demande_dossier_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;
create trigger trg_gen_numero_dossier before insert on demande
  for each row execute function gen_numero_dossier();

-- ============ Journal inaltérable (RM-151) : interdiction UPDATE/DELETE ============
create or replace function protect_journal() returns trigger
language plpgsql as $$
begin
  raise exception 'Le journal d''audit est inaltérable : modification ou suppression interdite.';
end;
$$;
create trigger trg_protect_journal_upd before update on journal_audit
  for each row execute function protect_journal();
create trigger trg_protect_journal_del before delete on journal_audit
  for each row execute function protect_journal();

-- ============ Décision irréversible (RM-092) : interdiction UPDATE/DELETE ============
create or replace function protect_decision() returns trigger
language plpgsql as $$
begin
  raise exception 'Une décision est irréversible : elle ne peut être ni modifiée ni supprimée (RM-092).';
end;
$$;
create trigger trg_protect_decision_upd before update on decision
  for each row execute function protect_decision();
create trigger trg_protect_decision_del before delete on decision
  for each row execute function protect_decision();

-- ============ Remise uniquement sur dossier validé (RM-091) ============
create or replace function check_remise_validee() returns trigger
language plpgsql as $$
declare v_etat demande_etat;
begin
  select etat into v_etat from demande where id_demande = new.id_demande;
  if v_etat is distinct from 'validee' then
    raise exception 'Remise impossible : la demande % n''est pas au statut validée (RM-091).', new.id_demande;
  end if;
  return new;
end;
$$;
create trigger trg_check_remise_validee before insert on distribution
  for each row execute function check_remise_validee();

-- ============ Bénéfice unique / non-cumul (RM-032, RM-097) ============
create or replace function check_non_cumul() returns trigger
language plpgsql as $$
declare v_personne uuid; v_deja int;
begin
  select id_personne into v_personne from demande where id_demande = new.id_demande;
  select count(*) into v_deja
  from distribution d
  join demande dm on dm.id_demande = d.id_demande
  where dm.id_personne = v_personne
    and d.id_distribution <> new.id_distribution;
  if v_deja > 0 then
    raise exception 'Bénéfice unique : cette personne a déjà reçu un terminal sur la période (RM-032).';
  end if;
  return new;
end;
$$;
create trigger trg_check_non_cumul before insert on distribution
  for each row execute function check_non_cumul();

-- ============ Respect du quota de campagne (RM-034) ============
create or replace function check_quota() returns trigger
language plpgsql as $$
declare v_campagne uuid; v_quota int; v_valides int;
begin
  if new.sens = 'validee' then
    select id_campagne into v_campagne from demande where id_demande = new.id_demande;
    select quota_total into v_quota from campagne where id_campagne = v_campagne;
    select count(*) into v_valides
    from decision dec
    join demande dm on dm.id_demande = dec.id_demande
    where dm.id_campagne = v_campagne and dec.sens = 'validee';
    if v_valides >= v_quota then
      raise exception 'Quota de campagne atteint (% attributions) : validation impossible (RM-034).', v_quota;
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_check_quota before insert on decision
  for each row execute function check_quota();

-- ============ Dossier probant obligatoire (RM-181) : contrainte différée ============
-- Toute distribution doit posséder une preuve_remise au moment du commit.
-- Un INSERT direct de distribution (sans preuve) via l'API échoue donc en fin de transaction.
create or replace function check_preuve_obligatoire() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from preuve_remise where id_distribution = new.id_distribution) then
    raise exception 'Dossier probant obligatoire : aucune preuve de remise pour la distribution % (RM-181).', new.id_distribution;
  end if;
  return new;
end;
$$;
create constraint trigger trg_preuve_obligatoire
  after insert on distribution
  deferrable initially deferred
  for each row execute function check_preuve_obligatoire();
