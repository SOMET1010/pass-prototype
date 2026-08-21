-- Mise à jour du mode d'accès / délai / activation d'une source (superviseur).
create or replace function pass_source_maj(p_code text, p_mode text, p_delai_max_sec int, p_actif boolean)
returns source_externe language plpgsql security definer set search_path = public as $$
declare v source_externe;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  if p_mode not in ('fichier','service','declaratif') then raise exception 'Mode invalide.'; end if;
  update source_externe set mode = p_mode::mode_source,
     delai_max_sec = coalesce(p_delai_max_sec, delai_max_sec), actif = coalesce(p_actif, actif)
   where code = p_code returning * into v;
  if v.code is null then raise exception 'Source inconnue.'; end if;
  perform _log('source '||p_code||' vers mode '||p_mode, 'source_externe', p_code);
  return v;
end;$$;
grant execute on function pass_source_maj(text, text, int, boolean) to authenticated;
