-- Contact de notification : le bénéficiaire n'a souvent pas de téléphone personnel.
-- On enregistre un canal joignable (soi-même si équipé, un proche, le ménage, ou un relais).
alter table personne add column telephone_contact text;
alter table personne add column contact_relation text;  -- soi_meme / proche / menage / relais / aucun

create or replace function pass_maj_contact(p_id_personne uuid, p_telephone text, p_relation text)
returns personne language plpgsql security definer set search_path = public as $$
declare v personne;
begin
  if current_agent_role() is null then raise exception 'Acces refuse : agent non habilite.'; end if;
  update personne
     set telephone_contact = nullif(trim(coalesce(p_telephone,'')),''),
         contact_relation = p_relation
   where id_personne = p_id_personne
   returning * into v;
  if v.id_personne is null then raise exception 'Personne introuvable.'; end if;
  perform _log('mise a jour contact notification (' || coalesce(p_relation,'-') || ')', 'personne', v.id_personne::text);
  return v;
end;
$$;
grant execute on function pass_maj_contact(uuid, text, text) to authenticated;
