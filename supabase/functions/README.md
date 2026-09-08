# Edge Functions — Intégrations institutionnelles ANSUT

Deux passerelles déjà en service sur d'autres projets ANSUT, raccordées au
prototype PASS (Programme d'Accès aux Smartphones Subventionnés).

Chaîne d'appel réelle dans les deux cas ; bascule automatique en **mode simulé**
tant que les secrets ne sont pas fournis (le parcours n'est jamais bloqué).

## `ansut-hub` — messagerie (SMS / Email / WhatsApp)

Expédie une notification déjà enregistrée en base (via `pass_notifier_sms`) et
réinscrit le résultat (`statut`, `mode`, `ref_gateway`, `detail`) par
`pass_notification_maj_dispatch`.

Requête : `POST { id_notification: uuid, canal?: "SMS" | "Email" | "WhatsApp" }`

Secrets à définir (Project Settings → Edge Functions → Secrets) :

| Secret | Rôle |
| --- | --- |
| `ANSUT_HUB_URL` | Base de la passerelle (ex. `https://hub.ansut.ci`) |
| `ANSUT_HUB_USERNAME` | Identifiant de service |
| `ANSUT_HUB_PASSWORD` | Mot de passe de service |

## `ansut-cachet` — cachet électronique (Cryptologie ANSUT)

Scelle une pièce probante (`decision` ou `preuve_remise`) :

1. `pass_sceller` calcule l'empreinte **SHA-256** du document en base et pose une
   signature de démonstration (HMAC) — fonctionne toujours, même hors ligne.
2. Si les secrets de cryptologie sont présents, la fonction demande une signature
   qualifiée + horodatage au service ANSUT et bascule le cachet en mode réel via
   `pass_cachet_maj`.

Requête : `POST { cible_type: "decision" | "preuve_remise", cible_id: uuid }`

Secrets :

| Secret | Rôle |
| --- | --- |
| `ANSUT_CRYPTO_URL` | Base du service de cryptologie |
| `ANSUT_CRYPTO_USERNAME` | Identifiant de service |
| `ANSUT_CRYPTO_PASSWORD` | Mot de passe de service |
| `ANSUT_CRYPTO_AUTORITE` | (option) libellé de l'autorité de cachet |

> Le contrat exact du service de cryptologie provient des projets ANSUT
> existants. L'adaptateur poste `{ hash, algorithm }` et lit `{ signature,
> reference }` : à ajuster au format réel le jour du raccordement. L'empreinte,
> elle, est déjà calculée et immuable.

## `ansut-voix` — synthèse vocale (narration de la démonstration)

Donne à la démonstration guidée une **voix institutionnelle** (Azure OpenAI TTS)
au lieu de la voix du navigateur. La **clé API reste côté serveur** (secret Edge
Function) — elle n'est jamais exposée dans le site statique.

Requête : `POST { texte: string, voix?: string, instructions?: string }`
→ renvoie l'audio (`audio/mpeg`). Accès réservé à un **agent authentifié**.

Repli automatique : sans la clé, la fonction répond `{ configured: false }` et le
frontend bascule sur la voix du navigateur (Web Speech API). Le parcours n'est
jamais bloqué.

Secrets :

| Secret | Rôle |
| --- | --- |
| `AZURE_OPENAI_TTS_KEY` | **Requis** — clé API Azure OpenAI. Alias accepté : `AZURE_OPENAI_API_KEY` |
| `AZURE_OPENAI_TTS_ENDPOINT` | (option) défaut `https://dtdi-openai-audio-02.openai.azure.com/` (ressource où vit le déploiement) |
| `AZURE_OPENAI_TTS_DEPLOYMENT` | (option) défaut `gpt-4o-mini-tts` |
| `AZURE_OPENAI_TTS_API_VERSION` | (option) défaut `2025-03-01-preview` |
| `AZURE_OPENAI_TTS_VOICE` | (option) défaut `alloy` (autres : `sage`, `nova`, `coral`, `echo`, `shimmer`…) |
| `AZURE_OPENAI_TTS_INSTRUCTIONS` | (option) ton de la narration |

> Le secret **générique** `AZURE_OPENAI_ENDPOINT` n'est **pas** lu pour l'endpoint :
> il peut pointer une autre ressource que celle de la clé (source d'un 401
> « invalid subscription key or wrong API endpoint »). Pour surcharger l'endpoint,
> utiliser le secret **dédié** `AZURE_OPENAI_TTS_ENDPOINT`.
>
> Intégration validée le 08/09/2026 : génération MP3 réelle (gpt-4o-mini-tts,
> ressource audio-02) — HTTP 200, `audio/mpeg`.

> **Activation** : la seule action requise le jour du raccordement est de poser
> le secret `AZURE_OPENAI_TTS_KEY` (Project Settings → Edge Functions → Secrets,
> ou `supabase secrets set AZURE_OPENAI_TTS_KEY=…`). Endpoint et déploiement sont
> déjà pré-remplis par défaut ; aucun redéploiement n'est nécessaire.

## Déploiement

```bash
supabase functions deploy ansut-hub
supabase functions deploy ansut-cachet
supabase functions deploy ansut-voix
```
