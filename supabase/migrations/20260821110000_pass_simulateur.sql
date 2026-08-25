-- Simulateur d'éligibilité (CDC v3) : calcul PUR, aucune écriture ni persistance.
-- Applique le moteur (régularité + score C1–C5 → rang P1–P4) avec les paramètres
-- administrables en vigueur. Formation, démonstration, test d'impact des poids.
create or replace function pass_simuler_eligibilite(p_in jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ctr jsonb; r_ident text; r_major text; r_rsu text; r_cumul text; r_ligne text; r_camp text;
  v_statut text; techno text; activite int; seuil_inact int;
  c1 numeric; c2 numeric; c3 numeric; c4 numeric; c5 numeric;
  p1 int; p2 int; p3 int; p4 int; p5 int; s_p1 int; s_p2 int; s_p3 int; sc numeric; v_rang text;
begin
  if not is_active_agent() then raise exception 'Accès refusé.'; end if;
  ctr := coalesce(p_in->'controles','{}'::jsonb);
  r_ident := coalesce(ctr->>'identite','concluant');
  r_major := coalesce(ctr->>'majorite','concluant');
  r_rsu   := coalesce(ctr->>'ayant_droit','concluant');
  r_cumul := coalesce(ctr->>'non_cumul','concluant');
  r_ligne := coalesce(ctr->>'ligne_mobile','concluant');
  r_camp  := coalesce(ctr->>'campagne','concluant');
  if 'non_concluant' in (r_ident,r_major,r_rsu,r_cumul,r_ligne,r_camp) then v_statut := 'refus';
  elsif 'indisponible' in (r_ident,r_major,r_rsu,r_cumul,r_ligne,r_camp) then v_statut := 'a_instruire';
  else v_statut := 'recevable'; end if;
  seuil_inact := coalesce(param_num('seuil_inactivite_terminal_jours'),120);
  techno := coalesce(p_in->>'techno','4G');
  activite := coalesce((p_in->>'activite_jours')::int, 0);
  c1 := case techno when '4G' then 0.20 when '3G' then 0.50 else 0.85 end;
  if coalesce((p_in->>'possede_perso')::boolean, true) = false then c1 := greatest(c1, 0.85); end if;
  if activite > seuil_inact then c1 := greatest(c1, 0.85); end if;
  c2 := least(1, greatest(0, coalesce((p_in->>'c2')::numeric, 0.5)));
  c3 := least(1, greatest(0, coalesce((p_in->>'c3')::numeric, 0.5)));
  c4 := least(1, greatest(0, coalesce((p_in->>'c4')::numeric, 0.5)));
  c5 := least(1, greatest(0, coalesce((p_in->>'c5')::numeric, 0.3)));
  c1 := round(c1,3);
  p1 := coalesce(param_num('score_c1_poids'),30); p2 := coalesce(param_num('score_c2_poids'),25);
  p3 := coalesce(param_num('score_c3_poids'),20); p4 := coalesce(param_num('score_c4_poids'),15);
  p5 := coalesce(param_num('score_c5_poids'),10);
  s_p1 := coalesce(param_num('seuil_p1'),75); s_p2 := coalesce(param_num('seuil_p2'),55); s_p3 := coalesce(param_num('seuil_p3'),35);
  sc := p1*c1 + p2*c2 + p3*c3 + p4*c4 + p5*c5;
  v_rang := case when v_statut <> 'recevable' then null
                 when sc >= s_p1 then 'P1' when sc >= s_p2 then 'P2' when sc >= s_p3 then 'P3' else 'P4' end;
  return jsonb_build_object(
    'statut_regularite', v_statut,
    'score', case when v_statut='recevable' then round(sc,2) else null end,
    'rang', v_rang,
    'controles', jsonb_build_object('identite',r_ident,'majorite',r_major,'ayant_droit',r_rsu,
                                    'non_cumul',r_cumul,'ligne_mobile',r_ligne,'campagne',r_camp),
    'dimensions', jsonb_build_array(
      jsonb_build_object('dimension','C1','libelle','Disponibilité d''un smartphone personnel','valeur',c1,'poids',p1,'contribution',round(p1*c1,2)),
      jsonb_build_object('dimension','C2','libelle','Vulnérabilité socio-économique','valeur',c2,'poids',p2,'contribution',round(p2*c2,2)),
      jsonb_build_object('dimension','C3','libelle','Accès autonome au numérique','valeur',c3,'poids',p3,'contribution',round(p3*c3,2)),
      jsonb_build_object('dimension','C4','libelle','Accessibilité au marché','valeur',c4,'poids',p4,'contribution',round(p4*c4,2)),
      jsonb_build_object('dimension','C5','libelle','Vulnérabilités spécifiques','valeur',c5,'poids',p5,'contribution',round(p5*c5,2))),
    'parametres', param_snapshot(array['score_individuel'])
  );
end;
$$;
grant execute on function pass_simuler_eligibilite(jsonb) to authenticated;
