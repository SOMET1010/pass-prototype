-- ============================================================================
-- Intégration des API institutionnelles ANSUT (déjà en service sur d'autres
-- projets ANSUT) :
--   1. ANSUT Hub  — passerelle de messagerie (SMS / Email / WhatsApp) pour
--      notifier réellement le bénéficiaire (ou son contact) du lieu de retrait
--      et de la décision, en remplacement du SMS purement simulé.
--   2. Cryptologie ANSUT — service de cachet électronique / horodatage pour
--      sceller les pièces probantes (décision, preuve de remise) : empreinte
--      SHA-256 + signature, de sorte que le dossier soit inaltérable et
--      opposable.
--
-- Principe de prototype conservé : sans identifiants configurés côté Edge
-- Function, l'intégration fonctionne en mode « SIMULÉ » (empreinte réelle
-- calculée en base, signature de démonstration, envoi journalisé sans appel
-- externe). Dès que les secrets ANSUT_HUB_* / ANSUT_CRYPTO_* sont renseignés,
-- la même chaîne bascule en mode « RÉEL » via les Edge Functions.
-- Toutes les écritures restent passées par des fonctions nommées (auditables,
-- non contournables par appel direct à l'API).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. NOTIFICATIONS — cycle de vie de l'envoi (ANSUT Hub)
-- ---------------------------------------------------------------------------
alter table notification add column if not exists statut       text not null default 'en_attente';  -- en_attente / envoye / echec
alter table notification add column if not exists gateway      text not null default 'ansut-hub';
alter table notification add column if not exists mode         text not null default 'simule';       -- simule / reel
alter table notification add column if not exists ref_gateway  text;    -- identifiant retourné par la passerelle
alter table notification add column if not exists detail       text;    -- diagnostic (code/erreur) éventuel

alter table notification drop constraint if exists chk_notif_statut;
alter table notification add constraint chk_notif_statut check (statut in ('en_attente','envoye','echec'));
alter table notification drop constraint if exists chk_notif_mode;
alter table notification add constraint chk_notif_mode   check (mode in ('simule','reel'));

-- La création de la notification passe déjà par pass_notifier_sms : on la
-- redéfinit pour l'ouvrir à tous les canaux du Hub et poser l'état initial.
create or replace function pass_notifier_sms(p_id_demande uuid, p_destinataire text, p_message text)
returns notification language plpgsql security definer set search_path = public as $$
declare v notification; v_num text;
begin
  if current_agent_role() is null then raise exception 'Accès refusé : agent non habilité.'; end if;
  insert into notification(id_demande, canal, destinataire, message, est_simule, statut, gateway, mode)
  values (p_id_demande, 'sms', p_destinataire, p_message, true, 'en_attente', 'ansut-hub', 'simule')
  returning * into v;
  select numero_dossier into v_num from demande where id_demande = p_id_demande;
  perform _log('Notification préparée (ANSUT Hub) — en attente d''envoi', 'demande', coalesce(v_num, p_id_demande::text));
  return v;
end;
$$;
grant execute on function pass_notifier_sms(uuid, text, text) to authenticated;

-- Mise à jour du résultat d'envoi par l'Edge Function (rôle service uniquement).
create or replace function pass_notification_maj_dispatch(
  p_id_notification uuid,
  p_statut          text,
  p_mode            text,
  p_ref             text,
  p_detail          text
) returns notification language plpgsql security definer set search_path = public as $$
declare v notification; v_num text;
begin
  if p_statut not in ('en_attente','envoye','echec') then raise exception 'Statut invalide.'; end if;
  if p_mode   not in ('simule','reel')                then raise exception 'Mode invalide.';   end if;
  update notification
     set statut = p_statut,
         mode   = p_mode,
         est_simule = (p_mode = 'simule'),
         ref_gateway = p_ref,
         detail = p_detail
   where id_notification = p_id_notification
   returning * into v;
  if v.id_notification is null then raise exception 'Notification introuvable.'; end if;
  select numero_dossier into v_num from demande where id_demande = v.id_demande;
  perform _log(
    'Notification ' || (case when p_statut = 'envoye' then 'envoyée' when p_statut = 'echec' then 'en échec' else 'mise à jour' end)
      || ' via ANSUT Hub (' || p_mode || ')',
    'demande', coalesce(v_num, v.id_demande::text));
  return v;
end;
$$;
revoke all on function pass_notification_maj_dispatch(uuid, text, text, text, text) from public;
grant execute on function pass_notification_maj_dispatch(uuid, text, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 2. CACHET ÉLECTRONIQUE — scellement des pièces probantes (Cryptologie ANSUT)
-- ---------------------------------------------------------------------------
create table if not exists cachet_electronique (
  id_cachet         uuid primary key default gen_random_uuid(),
  cible_type        text not null check (cible_type in ('decision','preuve_remise')),
  cible_id          uuid not null,
  algorithme        text not null default 'SHA-256',
  empreinte         text not null,                              -- hex, calculée en base
  signature         text not null,                              -- base64
  autorite          text not null default 'Cachet local (prototype)',
  reference         text,                                        -- identifiant du service de cryptologie
  horodatage_scelle timestamptz not null default now(),
  mode              text not null default 'simule' check (mode in ('simule','reel')),
  est_simule        boolean not null default true,
  created_at        timestamptz not null default now(),
  constraint uq_cachet_cible unique (cible_type, cible_id)
);
alter table cachet_electronique enable row level security;
create policy sel_cachet on cachet_electronique for select to authenticated using (is_active_agent());

-- Construit la charge canonique (jsonb à clés ordonnées) d'une cible scellable.
create or replace function _cachet_payload(p_cible_type text, p_cible_id uuid)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare v jsonb;
begin
  if p_cible_type = 'decision' then
    select jsonb_build_object(
             'type', 'decision',
             'id_decision', d.id_decision,
             'numero_dossier', dem.numero_dossier,
             'sens', d.sens,
             'motif', coalesce(d.motif, ''),
             'horodatage', to_char(d.horodatage at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
             'personne', p.nom || ' ' || p.prenoms,
             'numero_cni', p.numero_cni)
      into v
      from decision d
      join demande dem on dem.id_demande = d.id_demande
      join personne p on p.id_personne = dem.id_personne
     where d.id_decision = p_cible_id;
  elsif p_cible_type = 'preuve_remise' then
    select jsonb_build_object(
             'type', 'preuve_remise',
             'id_preuve', pr.id_preuve,
             'numero_dossier', dem.numero_dossier,
             'point_remise', dist.point_remise,
             'date_remise', to_char(dist.date_remise at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
             'geolocalisation', coalesce(pr.geolocalisation, ''),
             'imei', t.imei,
             'personne', p.nom || ' ' || p.prenoms,
             'horodatage', to_char(pr.horodatage at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
      into v
      from preuve_remise pr
      join distribution dist on dist.id_distribution = pr.id_distribution
      join demande dem on dem.id_demande = dist.id_demande
      join personne p on p.id_personne = dem.id_personne
      join terminal t on t.id_terminal = dist.id_terminal
     where pr.id_preuve = p_cible_id;
  else
    raise exception 'Type de cible non scellable : %', p_cible_type;
  end if;
  if v is null then raise exception 'Cible introuvable (% %).', p_cible_type, p_cible_id; end if;
  return v;
end;
$$;

-- Scelle une cible : empreinte SHA-256 réelle + signature de démonstration
-- (HMAC). Idempotent — renvoie le cachet existant s'il y en a déjà un.
-- Le mode « réel » (signature du service de cryptologie ANSUT) est appliqué
-- ensuite par l'Edge Function via pass_cachet_maj.
-- search_path inclut « extensions » car pgcrypto (digest/hmac) y est installé sous Supabase.
create or replace function pass_sceller(p_cible_type text, p_cible_id uuid)
returns cachet_electronique language plpgsql security definer set search_path = public, extensions as $$
declare v cachet_electronique; v_payload jsonb; v_txt text; v_empreinte text; v_sig text;
begin
  if current_agent_role() is null then raise exception 'Accès refusé : agent non habilité.'; end if;

  select * into v from cachet_electronique where cible_type = p_cible_type and cible_id = p_cible_id;
  if v.id_cachet is not null then return v; end if;

  v_payload   := _cachet_payload(p_cible_type, p_cible_id);
  v_txt       := v_payload::text;
  v_empreinte := encode(digest(v_txt, 'sha256'), 'hex');
  -- Signature de démonstration : HMAC-SHA256 (clé fixe de prototype).
  v_sig       := encode(hmac(v_empreinte, 'PASS-PROTOTYPE-CACHET', 'sha256'), 'base64');

  insert into cachet_electronique(cible_type, cible_id, algorithme, empreinte, signature, autorite, mode, est_simule)
  values (p_cible_type, p_cible_id, 'SHA-256', v_empreinte, v_sig, 'Cachet local (prototype)', 'simule', true)
  on conflict (cible_type, cible_id) do nothing
  returning * into v;

  if v.id_cachet is null then
    select * into v from cachet_electronique where cible_type = p_cible_type and cible_id = p_cible_id;
  end if;

  perform _log('Pièce scellée (cachet ' || v.algorithme || ', mode simulé)', p_cible_type, p_cible_id::text);
  return v;
end;
$$;
grant execute on function pass_sceller(text, uuid) to authenticated;

-- Bascule un cachet en mode « réel » avec la signature retournée par le
-- service de cryptologie ANSUT (Edge Function, rôle service uniquement).
-- L'empreinte n'est jamais réécrite : elle reste celle calculée en base.
create or replace function pass_cachet_maj(
  p_id_cachet uuid,
  p_signature text,
  p_reference text,
  p_autorite  text
) returns cachet_electronique language plpgsql security definer set search_path = public as $$
declare v cachet_electronique;
begin
  update cachet_electronique
     set signature = coalesce(p_signature, signature),
         reference = p_reference,
         autorite  = coalesce(nullif(trim(coalesce(p_autorite,'')), ''), autorite),
         mode = 'reel',
         est_simule = false,
         horodatage_scelle = now()
   where id_cachet = p_id_cachet
   returning * into v;
  if v.id_cachet is null then raise exception 'Cachet introuvable.'; end if;
  perform _log('Cachet électronique scellé (mode réel, ' || coalesce(v.autorite,'-') || ')', v.cible_type, v.cible_id::text);
  return v;
end;
$$;
revoke all on function pass_cachet_maj(uuid, text, text, text) from public;
grant execute on function pass_cachet_maj(uuid, text, text, text) to service_role;
