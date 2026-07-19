-- ===== Indicateurs de delai (SLA) =====
alter table demande add column duree_enrolement_sec int;

drop function if exists pass_soumettre_demande(uuid);
create or replace function pass_soumettre_demande(p_id_demande uuid, p_duree_sec int default null)
returns demande language plpgsql security definer set search_path = public as $$
declare v demande;
begin
  if current_agent_role() is null then raise exception 'Acces refuse : agent non habilite.'; end if;
  select * into v from demande where id_demande = p_id_demande;
  if v.id_demande is null then raise exception 'Demande introuvable.'; end if;
  if not v.consentement or v.consentement_moyen is null then
    raise exception 'Soumission impossible : le consentement est obligatoire (RM-184).';
  end if;
  update demande set etat = 'soumise', date_soumission = now(),
         duree_enrolement_sec = coalesce(p_duree_sec, duree_enrolement_sec)
   where id_demande = p_id_demande and etat = 'brouillon' returning * into v;
  perform _log('soumission demande' || coalesce(' (' || p_duree_sec || ' s)', ''), 'demande', v.numero_dossier);
  return v;
end;
$$;
grant execute on function pass_soumettre_demande(uuid, int) to authenticated;

-- ===== Cloture d'operation apres audit de la procedure =====
create table cloture (
  id_cloture   uuid primary key default gen_random_uuid(),
  id_demande   uuid not null unique references demande(id_demande),
  conforme     boolean not null,
  observations text,
  id_agent     uuid not null references agent(id_agent),
  horodatage   timestamptz not null default now()
);
alter table cloture enable row level security;
create policy sel_cloture on cloture for select to authenticated using (is_active_agent());

create or replace function pass_cloturer(p_id_demande uuid, p_conforme boolean, p_observations text)
returns cloture language plpgsql security definer set search_path = public as $$
declare v cloture; v_dec decision; v_dist uuid; v_num text; v_role agent_role;
begin
  v_role := current_agent_role();
  if v_role is null or v_role not in ('superviseur','instructeur') then
    raise exception 'Acces refuse : la cloture apres audit est reservee a l''instructeur / superviseur.';
  end if;
  select * into v_dec from decision where id_demande = p_id_demande;
  if v_dec.id_decision is null then raise exception 'Cloture impossible : aucune decision prononcee.'; end if;
  if v_dec.sens = 'validee' then
    select id_distribution into v_dist from distribution where id_demande = p_id_demande;
    if v_dist is null then raise exception 'Cloture impossible : dossier valide sans remise effectuee.'; end if;
  end if;
  insert into cloture(id_demande, conforme, observations, id_agent)
  values (p_id_demande, p_conforme, nullif(trim(coalesce(p_observations,'')),''), current_agent_id())
  returning * into v;
  select numero_dossier into v_num from demande where id_demande = p_id_demande;
  perform _log('cloture operation (' || case when p_conforme then 'conforme' else 'non conforme' end || ')', 'demande', v_num);
  return v;
end;
$$;
grant execute on function pass_cloturer(uuid, boolean, text) to authenticated;
