-- ============================================================================
-- COMMANDES FOURNISSEURS (bons de commande) — maillon amont de la logistique.
-- La commande précède l'arrivage : on commande des terminaux à un fournisseur,
-- on suit son cycle (brouillon → envoyée → confirmée → livrée), puis l'arrivage
-- réel est rattaché à la commande pour rapprochement commandé / livré.
-- Écritures via RPC SECURITY DEFINER, réservées au superviseur, auditées.
-- ============================================================================

create type commande_statut as enum
  ('brouillon','envoyee','confirmee','partiellement_livree','livree','annulee');

create table commande (
  id_commande    uuid primary key default gen_random_uuid(),
  reference      text not null unique,               -- n° de bon de commande
  id_fournisseur uuid not null references fournisseur(id_fournisseur),
  date_commande  timestamptz not null default now(),
  date_souhaitee date,
  statut         commande_statut not null default 'brouillon',
  montant_total  numeric(14,2) not null default 0,
  devise         text not null default 'XOF',
  note           text,
  id_agent       uuid references agent(id_agent),
  created_at     timestamptz not null default now()
);
create table commande_ligne (
  id_ligne       uuid primary key default gen_random_uuid(),
  id_commande    uuid not null references commande(id_commande) on delete cascade,
  modele         text not null,
  quantite       int not null check (quantite > 0),
  prix_unitaire  numeric(12,2) not null default 0
);
create index idx_commande_fournisseur on commande(id_fournisseur);
create index idx_commande_ligne on commande_ligne(id_commande);

-- Rattachement de l'arrivage à la commande d'origine.
alter table arrivage add column id_commande uuid references commande(id_commande);

alter table commande       enable row level security;
alter table commande_ligne enable row level security;
create policy sel_commande       on commande       for select to authenticated using (is_active_agent());
create policy sel_commande_ligne on commande_ligne for select to authenticated using (is_active_agent());

-- ---- Créer un bon de commande (brouillon) + lignes ----
-- p_lignes : jsonb [{modele, quantite, prix_unitaire}]
create or replace function pass_creer_commande(p_reference text, p_id_fournisseur uuid,
                                               p_date_souhaitee date, p_devise text, p_note text, p_lignes jsonb)
returns commande language plpgsql security definer set search_path = public as $$
declare v commande; l jsonb; v_total numeric(14,2) := 0;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  insert into commande(reference, id_fournisseur, date_souhaitee, devise, note, statut, id_agent)
  values (p_reference, p_id_fournisseur, p_date_souhaitee,
          coalesce(nullif(trim(coalesce(p_devise,'')),''),'XOF'), p_note, 'brouillon', current_agent_id())
  returning * into v;
  for l in select * from jsonb_array_elements(coalesce(p_lignes,'[]'::jsonb)) loop
    insert into commande_ligne(id_commande, modele, quantite, prix_unitaire)
    values (v.id_commande, l->>'modele', (l->>'quantite')::int, coalesce((l->>'prix_unitaire')::numeric,0));
    v_total := v_total + (l->>'quantite')::int * coalesce((l->>'prix_unitaire')::numeric,0);
  end loop;
  update commande set montant_total = v_total where id_commande = v.id_commande returning * into v;
  perform _log('création commande ' || v.reference || ' (' || v_total || ' ' || v.devise || ')', 'commande', v.id_commande::text);
  return v;
end;
$$;
grant execute on function pass_creer_commande(text, uuid, date, text, text, jsonb) to authenticated;

-- ---- Changer le statut d'une commande (envoi, confirmation, clôture…) ----
create or replace function pass_maj_statut_commande(p_id_commande uuid, p_statut text)
returns commande language plpgsql security definer set search_path = public as $$
declare v commande;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  if p_statut not in ('brouillon','envoyee','confirmee','partiellement_livree','livree','annulee') then
    raise exception 'Statut de commande invalide.';
  end if;
  update commande set statut = p_statut::commande_statut where id_commande = p_id_commande returning * into v;
  if v.id_commande is null then raise exception 'Commande introuvable.'; end if;
  perform _log('commande ' || v.reference || ' → ' || p_statut, 'commande', v.id_commande::text);
  return v;
end;
$$;
grant execute on function pass_maj_statut_commande(uuid, text) to authenticated;

-- ---- L'arrivage peut désormais référencer une commande ----
-- On remplace la version 4-arg (migration précédente) par une version 5-arg
-- (commande optionnelle) — on retire l'ancienne pour éviter toute ambiguïté.
drop function if exists pass_creer_arrivage(text, uuid, date, jsonb);
create or replace function pass_creer_arrivage(p_reference text, p_id_fournisseur uuid, p_date_prevue date,
                                               p_lignes jsonb, p_id_commande uuid default null)
returns arrivage language plpgsql security definer set search_path = public as $$
declare v arrivage; l jsonb; v_ligne uuid; i int := 0; v_code text;
begin
  if not _is_superviseur() then raise exception 'Accès refusé : réservé au superviseur.'; end if;
  insert into arrivage(reference, id_fournisseur, date_prevue, statut, id_commande)
  values (p_reference, p_id_fournisseur, p_date_prevue, 'attendu', p_id_commande) returning * into v;
  for l in select * from jsonb_array_elements(coalesce(p_lignes,'[]'::jsonb)) loop
    i := i + 1;
    insert into colisage_ligne(id_arrivage, modele, quantite_attendue, imei_debut, imei_fin)
    values (v.id_arrivage, l->>'modele', (l->>'quantite')::int, l->>'imei_debut', l->>'imei_fin')
    returning id_ligne into v_ligne;
    v_code := 'CX-' || regexp_replace(upper(v.reference),'[^A-Z0-9]','','g') || '-' || lpad(i::text,3,'0');
    insert into colis(id_arrivage, id_ligne, code_barre, modele, quantite_attendue, imei_debut, imei_fin, statut)
    values (v.id_arrivage, v_ligne, v_code, l->>'modele', (l->>'quantite')::int, l->>'imei_debut', l->>'imei_fin', 'attendu');
  end loop;
  -- Si la commande était envoyée/confirmée, la marquer partiellement livrée à l'arrivée.
  if p_id_commande is not null then
    update commande set statut = 'partiellement_livree'
     where id_commande = p_id_commande and statut in ('envoyee','confirmee');
  end if;
  perform _log('création arrivage ' || v.reference || ' (' || i || ' colis attendus)', 'arrivage', v.id_arrivage::text);
  return v;
end;
$$;
grant execute on function pass_creer_arrivage(text, uuid, date, jsonb, uuid) to authenticated;
