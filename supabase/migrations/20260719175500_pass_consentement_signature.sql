-- Capture reelle du consentement : signature (image), ou temoin (public analphabete)
alter table demande add column consentement_signature text;  -- data URL de la signature
alter table demande add column consentement_temoin text;      -- nom du temoin (assiste)

drop function if exists pass_enregistrer_consentement(uuid, consentement_moyen);
create or replace function pass_enregistrer_consentement(
  p_id_demande uuid, p_moyen consentement_moyen, p_signature text default null, p_temoin text default null
) returns demande language plpgsql security definer set search_path = public as $$
declare v demande;
begin
  if current_agent_role() is null then raise exception 'Acces refuse : agent non habilite.'; end if;
  update demande
     set consentement = true,
         consentement_moyen = p_moyen,
         consentement_signature = nullif(p_signature, ''),
         consentement_temoin = nullif(trim(coalesce(p_temoin,'')), '')
   where id_demande = p_id_demande and etat in ('brouillon','soumise')
   returning * into v;
  if v.id_demande is null then raise exception 'Consentement impossible sur cette demande.'; end if;
  perform _log('recueil consentement (' || p_moyen || ')', 'demande', v.numero_dossier);
  return v;
end;
$$;
grant execute on function pass_enregistrer_consentement(uuid, consentement_moyen, text, text) to authenticated;
