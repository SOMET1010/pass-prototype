-- ===== Module SAV : suivi après remise du terminal =====
create type sav_type as enum ('perte', 'vol', 'panne', 'autre');
create type sav_statut as enum ('ouvert', 'en_cours', 'resolu');

create table sav_ticket (
  id_ticket       uuid primary key default gen_random_uuid(),
  id_distribution uuid not null references distribution(id_distribution),
  type_incident   sav_type not null,
  statut          sav_statut not null default 'ouvert',
  description     text,
  resolution      text,
  id_agent        uuid not null references agent(id_agent),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);
create index idx_sav_distribution on sav_ticket(id_distribution);
create index idx_sav_statut on sav_ticket(statut);

alter table sav_ticket enable row level security;
create policy sel_sav on sav_ticket for select to authenticated using (is_active_agent());

-- Ouverture d'un ticket SAV. Vol -> terminal bloque (anti-revente) ; perte -> terminal perdu.
create or replace function pass_ouvrir_sav(p_id_distribution uuid, p_type sav_type, p_description text)
returns sav_ticket language plpgsql security definer set search_path = public as $$
declare v sav_ticket; v_role agent_role; v_term uuid; v_num text;
begin
  v_role := current_agent_role();
  if v_role is null or v_role not in ('remise','superviseur','instructeur') then
    raise exception 'Acces refuse : ouverture SAV reservee aux agents habilites.';
  end if;
  insert into sav_ticket(id_distribution, type_incident, description, id_agent)
  values (p_id_distribution, p_type, p_description, current_agent_id())
  returning * into v;
  select d.id_terminal, dm.numero_dossier into v_term, v_num
    from distribution d join demande dm on dm.id_demande = d.id_demande
   where d.id_distribution = p_id_distribution;
  if p_type = 'vol' then
    update terminal set statut = 'bloque' where id_terminal = v_term;
  elsif p_type = 'perte' then
    update terminal set statut = 'perdu' where id_terminal = v_term;
  end if;
  perform _log('ouverture SAV (' || p_type || ')', 'demande', v_num);
  return v;
end;
$$;
grant execute on function pass_ouvrir_sav(uuid, sav_type, text) to authenticated;

create or replace function pass_traiter_sav(
  p_id_ticket uuid, p_statut sav_statut, p_resolution text, p_id_terminal_remplacement uuid default null
) returns sav_ticket language plpgsql security definer set search_path = public as $$
declare v sav_ticket; v_role agent_role; v_dist uuid; v_pers uuid; v_num text;
begin
  v_role := current_agent_role();
  if v_role is null or v_role not in ('remise','superviseur') then
    raise exception 'Acces refuse : traitement SAV reserve aux agents de remise / superviseur.';
  end if;
  update sav_ticket set statut = p_statut, resolution = p_resolution,
         resolved_at = case when p_statut = 'resolu' then now() else resolved_at end
   where id_ticket = p_id_ticket returning * into v;
  if v.id_ticket is null then raise exception 'Ticket SAV introuvable.'; end if;

  if p_id_terminal_remplacement is not null then
    select d.id_distribution, dm.id_personne into v_dist, v_pers
      from distribution d join demande dm on dm.id_demande = d.id_demande
     where d.id_distribution = v.id_distribution;
    if not exists (select 1 from terminal where id_terminal = p_id_terminal_remplacement and statut = 'en_stock') then
      raise exception 'Le terminal de remplacement doit etre en stock.';
    end if;
    update terminal set statut = 'remis', id_personne = v_pers where id_terminal = p_id_terminal_remplacement;
    update distribution set id_terminal = p_id_terminal_remplacement where id_distribution = v_dist;
  end if;

  select dm.numero_dossier into v_num from distribution d join demande dm on dm.id_demande = d.id_demande
   where d.id_distribution = v.id_distribution;
  perform _log('traitement SAV -> ' || p_statut, 'demande', v_num);
  return v;
end;
$$;
grant execute on function pass_traiter_sav(uuid, sav_statut, text, uuid) to authenticated;
