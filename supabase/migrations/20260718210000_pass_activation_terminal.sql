-- RPC : marquer le terminal remis comme activé (suivi d'activation, RM-151)
create or replace function pass_activer_terminal(p_id_demande uuid)
returns distribution language plpgsql security definer set search_path = public as $$
declare v distribution; v_role agent_role; v_num text;
begin
  v_role := current_agent_role();
  if v_role is null or v_role not in ('remise','superviseur') then
    raise exception 'Accès refusé : seul un agent de remise peut confirmer l''activation.';
  end if;
  update distribution set statut_activation = 'active'
   where id_demande = p_id_demande returning * into v;
  if v.id_distribution is null then
    raise exception 'Aucune remise à activer pour cette demande.';
  end if;
  select numero_dossier into v_num from demande where id_demande = p_id_demande;
  perform _log('activation du terminal', 'demande', v_num);
  return v;
end;
$$;
grant execute on function pass_activer_terminal(uuid) to authenticated;
