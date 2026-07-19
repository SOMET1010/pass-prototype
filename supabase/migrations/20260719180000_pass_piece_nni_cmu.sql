-- Lecture de piece (SIMULEE) : NNI, n CMU et photos des pieces
alter table personne add column nni text;
alter table personne add column numero_cmu text;
alter table personne add column piece_photo_url text;
alter table personne add column cmu_photo_url text;

create or replace function pass_maj_piece(
  p_id_personne uuid, p_nni text, p_numero_cmu text,
  p_piece_photo_url text default null, p_cmu_photo_url text default null
) returns personne language plpgsql security definer set search_path = public as $$
declare v personne;
begin
  if current_agent_role() is null then raise exception 'Acces refuse : agent non habilite.'; end if;
  update personne set
     nni = coalesce(nullif(trim(coalesce(p_nni,'')),''), nni),
     numero_cmu = coalesce(nullif(trim(coalesce(p_numero_cmu,'')),''), numero_cmu),
     piece_photo_url = coalesce(p_piece_photo_url, piece_photo_url),
     cmu_photo_url = coalesce(p_cmu_photo_url, cmu_photo_url)
   where id_personne = p_id_personne returning * into v;
  if v.id_personne is null then raise exception 'Personne introuvable.'; end if;
  perform _log('lecture piece (NNI/CMU)', 'personne', v.id_personne::text);
  return v;
end;
$$;
grant execute on function pass_maj_piece(uuid, text, text, text, text) to authenticated;
