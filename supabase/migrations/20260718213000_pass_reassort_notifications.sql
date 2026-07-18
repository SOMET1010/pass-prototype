-- ===== Réassort de stock entre centres (superviseur) =====
create or replace function pass_transferer_stock(p_from uuid, p_to uuid, p_quantite int)
returns int language plpgsql security definer set search_path = public as $$
declare v_role agent_role; v_ids uuid[]; v_count int;
begin
  v_role := current_agent_role();
  if v_role is null or v_role <> 'superviseur' then
    raise exception 'Accès refusé : le réassort est réservé au superviseur.';
  end if;
  if p_from = p_to then raise exception 'Les centres source et destination doivent être différents.'; end if;
  if p_quantite <= 0 then raise exception 'La quantité doit être positive.'; end if;

  select array_agg(id_terminal) into v_ids from (
    select id_terminal from terminal
     where statut = 'en_stock' and id_point_retrait = p_from
     order by imei limit p_quantite
  ) s;
  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count = 0 then raise exception 'Aucun terminal disponible au centre source.'; end if;

  update terminal set id_point_retrait = p_to where id_terminal = any(v_ids);
  perform _log('réassort de ' || v_count || ' terminal(aux)', 'point_retrait', p_to::text);
  return v_count;
end;
$$;
grant execute on function pass_transferer_stock(uuid, uuid, int) to authenticated;

-- ===== Notifications (SMS simulé) =====
create table notification (
  id_notification uuid primary key default gen_random_uuid(),
  id_demande      uuid not null references demande(id_demande),
  canal           text not null default 'sms',
  destinataire    text,
  message         text not null,
  est_simule      boolean not null default true,
  horodatage      timestamptz not null default now()
);
create index idx_notification_demande on notification(id_demande);
alter table notification enable row level security;
create policy sel_notification on notification for select to authenticated using (is_active_agent());

create or replace function pass_notifier_sms(p_id_demande uuid, p_destinataire text, p_message text)
returns notification language plpgsql security definer set search_path = public as $$
declare v notification; v_num text;
begin
  if current_agent_role() is null then raise exception 'Accès refusé : agent non habilité.'; end if;
  insert into notification(id_demande, canal, destinataire, message, est_simule)
  values (p_id_demande, 'sms', p_destinataire, p_message, true)
  returning * into v;
  select numero_dossier into v_num from demande where id_demande = p_id_demande;
  perform _log('SMS simulé — lieu de retrait', 'demande', v_num);
  return v;
end;
$$;
grant execute on function pass_notifier_sms(uuid, text, text) to authenticated;
