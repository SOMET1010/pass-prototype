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

## Déploiement

```bash
supabase functions deploy ansut-hub
supabase functions deploy ansut-cachet
```
