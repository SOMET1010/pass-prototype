-- Ciblage géographique — moteur (filtres → score normalisé pondéré → quota → réserve).
create or replace function pass_calculer_ciblage_geo(p_id_campagne uuid, p_volume_total int)
returns ciblage_geo language plpgsql security definer set search_path = public as $$
declare
  v ciblage_geo; v_vs int; v_vr int; v_cle numeric; v_plaf numeric; v_planch int;
  pd numeric; pp numeric; pr numeric; pf numeric; pl numeric; v_tn numeric;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  if p_volume_total <= 0 then raise exception 'Volume invalide.'; end if;
  v_cle := coalesce(param_num('cle_score_reserve_pct'),75);
  v_vs := floor(p_volume_total * v_cle/100.0);
  v_vr := p_volume_total - v_vs;
  pd := coalesce(param_num('score_geo_deficit'),30); pp := coalesce(param_num('score_geo_pauvrete'),25);
  pr := coalesce(param_num('score_geo_ruralite'),20); pf := coalesce(param_num('score_geo_femmes_jeunes'),15);
  pl := coalesce(param_num('score_geo_logistique'),10);
  v_plaf := coalesce(param_num('plafond_localite_pct'),25);
  v_planch := coalesce(param_num('plancher_localite'),5);
  v_tn := coalesce(param_num('taux_possession_national'), (select avg(taux_possession) from localite));
  insert into ciblage_geo(id_campagne, volume_total, volume_score, volume_reserve, parametres, id_agent)
  values (p_id_campagne, p_volume_total, v_vs, v_vr, param_snapshot(array['ciblage_geo']), current_agent_id())
  returning * into v;
  insert into ciblage_localite(id_ciblage, identifiant_localite, retenue, motif_exclusion)
  select v.id_ciblage, l.identifiant_localite, false,
    case when not (l.couverture_3g or l.couverture_4g) then 'Réseau : 2G seule (3G/4G requise)'
         when not (l.electrifiee or l.point_recharge) then 'Énergie : ni électrifiée ni point de recharge'
         when l.point_remise_id is null then 'Accessibilité : aucun point de remise' end
  from localite l
  where not ((l.couverture_3g or l.couverture_4g) and (l.electrifiee or l.point_recharge) and l.point_remise_id is not null);
  insert into ciblage_localite(id_ciblage, identifiant_localite, retenue, score, population_eligible, quota_score, quota_total)
  with ret as (
    select l.* from localite l
    where (l.couverture_3g or l.couverture_4g) and (l.electrifiee or l.point_recharge) and l.point_remise_id is not null),
  raw as (
    select r.identifiant_localite,
      greatest(0, v_tn - r.taux_possession) as raw_def, r.taux_pauvrete as raw_pau,
      (r.distance_site_km + case when r.rural then 20 else 0 end) as raw_rur,
      r.part_femmes_jeunes as raw_fj, 1000.0/(1.0 + r.distance_site_km) as raw_log,
      (r.population * r.taux_pauvrete)::int as pop_elig from ret r),
  bornes as (
    select min(raw_def) mnd,max(raw_def) mxd,min(raw_pau) mnp,max(raw_pau) mxp,min(raw_rur) mnr,max(raw_rur) mxr,
           min(raw_fj) mnf,max(raw_fj) mxf,min(raw_log) mnl,max(raw_log) mxl from raw),
  norm as (
    select raw.identifiant_localite, raw.pop_elig,
      case when b.mxd=b.mnd then 50 else 100*(raw.raw_def-b.mnd)/(b.mxd-b.mnd) end nd,
      case when b.mxp=b.mnp then 50 else 100*(raw.raw_pau-b.mnp)/(b.mxp-b.mnp) end np,
      case when b.mxr=b.mnr then 50 else 100*(raw.raw_rur-b.mnr)/(b.mxr-b.mnr) end nr,
      case when b.mxf=b.mnf then 50 else 100*(raw.raw_fj-b.mnf)/(b.mxf-b.mnf) end nf,
      case when b.mxl=b.mnl then 50 else 100*(raw.raw_log-b.mnl)/(b.mxl-b.mnl) end nl
    from raw cross join bornes b),
  scored as (select identifiant_localite, pop_elig, round((pd*nd + pp*np + pr*nr + pf*nf + pl*nl)/100.0, 2) as score from norm),
  tot as (select sum(score*pop_elig) sspe from scored),
  quota as (
    select s.identifiant_localite, s.score, s.pop_elig,
      least(greatest(round(v_vs * (s.score*s.pop_elig)/nullif((select sspe from tot),0)), v_planch), floor(p_volume_total * v_plaf/100.0))::int as q
    from scored s)
  select v.id_ciblage, q.identifiant_localite, true, q.score, q.pop_elig, q.q, q.q from quota q;
  perform _log('ciblage géographique : volume '||p_volume_total||' ('||v_vs||' score / '||v_vr||' réserve)', 'ciblage_geo', v.id_ciblage::text);
  return v;
end;
$$;
grant execute on function pass_calculer_ciblage_geo(uuid, int) to authenticated;

create or replace function pass_arbitrer_reserve(p_id_ciblage uuid, p_identifiant_localite text, p_quantite int, p_motif text)
returns arbitrage_reserve language plpgsql security definer set search_path = public as $$
declare v arbitrage_reserve; v_run ciblage_geo; v_deja int;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  if p_quantite <= 0 then raise exception 'Quantité invalide.'; end if;
  if coalesce(trim(p_motif),'') = '' then raise exception 'Motif obligatoire pour toute attribution sur la réserve.'; end if;
  select * into v_run from ciblage_geo where id_ciblage = p_id_ciblage;
  if v_run.id_ciblage is null then raise exception 'Ciblage introuvable.'; end if;
  select coalesce(sum(quantite),0) into v_deja from arbitrage_reserve where id_ciblage = p_id_ciblage;
  if v_deja + p_quantite > v_run.volume_reserve then raise exception 'Dépassement de la réserve (% restant).', v_run.volume_reserve - v_deja; end if;
  insert into arbitrage_reserve(id_ciblage, identifiant_localite, quantite, motif, id_agent)
  values (p_id_ciblage, p_identifiant_localite, p_quantite, p_motif, current_agent_id()) returning * into v;
  update ciblage_localite set quota_reserve = quota_reserve + p_quantite, quota_total = quota_total + p_quantite
   where id_ciblage = p_id_ciblage and identifiant_localite = p_identifiant_localite;
  perform _log('arbitrage réserve : +'||p_quantite||' à '||p_identifiant_localite||' ('||p_motif||')', 'ciblage_geo', p_id_ciblage::text);
  return v;
end;
$$;
grant execute on function pass_arbitrer_reserve(uuid, text, int, text) to authenticated;
