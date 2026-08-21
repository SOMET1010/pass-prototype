-- Profil d'usage déclaratif (CDC v3 §3.4) — SCHÉMA SÉPARÉ, non exposé par l'API.
-- Aucune vue/export/jointure vers l'éligibilité ; n'alimente jamais score/quotas/décision.
create schema if not exists app;
grant usage on schema app to authenticated;
create table app.profil_usage (
  id_profil uuid primary key default gen_random_uuid(),
  id_personne uuid not null unique,
  usage_principal text, autre_texte text,
  horodatage timestamptz not null default now(), maj_le timestamptz not null default now()
);
alter table app.profil_usage enable row level security;
create policy sel_profil on app.profil_usage for select to authenticated using (public.is_active_agent());

create or replace function public.pass_profil_usage_maj(p_id_personne uuid, p_usage text, p_autre text)
returns app.profil_usage language plpgsql security definer set search_path = public, app as $$
declare v app.profil_usage;
begin
  if not public.is_active_agent() then raise exception 'Accès refusé.'; end if;
  insert into app.profil_usage(id_personne, usage_principal, autre_texte)
  values (p_id_personne, nullif(trim(coalesce(p_usage,'')),''), nullif(trim(coalesce(p_autre,'')),''))
  on conflict (id_personne) do update
    set usage_principal = excluded.usage_principal, autre_texte = excluded.autre_texte, maj_le = now()
  returning * into v;
  perform public._log('profil d''usage déclaré (facultatif)', 'profil_usage', p_id_personne::text);
  return v;
end;$$;
grant execute on function public.pass_profil_usage_maj(uuid, text, text) to authenticated;

create or replace function public.pass_profil_usage_lire(p_id_personne uuid)
returns app.profil_usage language sql security definer set search_path = public, app stable as $$
  select * from app.profil_usage where id_personne = p_id_personne;
$$;
grant execute on function public.pass_profil_usage_lire(uuid) to authenticated;
