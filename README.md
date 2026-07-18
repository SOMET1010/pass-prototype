# Prototype PASS — Plateforme du Programme d'Accès au Smartphone Subventionné

> **Prototype de démonstration** porté par l'ANSUT. Vérifications simulées, données
> fictives, hébergement non souverain. **Non destiné à la production.**

Ce dépôt contient le prototype web de la plateforme PASS : enrôlement assisté,
vérification d'éligibilité, décision, remise du terminal, reçu bénéficiaire et
supervision. Il sert à démontrer le parcours aux décideurs et à valider l'ergonomie
avant le développement de production.

## Stack

- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth)
- **Langue** : français exclusivement
- **Charte** : bleu `#1D56A3`, orange `#F08221`

## Comptes de démonstration

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Enrôlement | `enrolement@pass.demo` | `passdemo2026` |
| Instructeur | `instructeur@pass.demo` | `passdemo2026` |
| Remise | `remise@pass.demo` | `passdemo2026` |
| Superviseur | `superviseur@pass.demo` | `passdemo2026` |

> Le compte **Superviseur** peut dérouler le parcours complet à lui seul
> (enrôlement → décision → remise).

## Personas de démonstration

| Persona | Pièce (CNI) | Situation | Issue attendue |
|---|---|---|---|
| Mariam KOUASSI | CI-001-334455 | Éligible complète | ÉLIGIBLE → reçu |
| Adama TRAORÉ | CI-002-778899 | A déjà bénéficié (2024) | NON ÉLIGIBLE (RM-032) |
| Awa DIALLO | CI-003-112233 | Sans ligne mobile | À INSTRUIRE (RM-038) |
| Koffi Yao | CI-004-556677 | Nom opérateur ≠ CNI | À INSTRUIRE |
| Fatou COULIBALY | CI-005-990011 | Consentement assisté | ÉLIGIBLE |

## Démarrage local

```bash
bun install         # ou npm install
bun run dev         # http://localhost:5173
```

Les variables Supabase sont dans `.env` (clé publiques uniquement — projet de démo) :

```
VITE_SUPABASE_URL=https://gkxmopdyudfuadhxyuwe.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

## Règles métier effectives EN BASE (non contournables via l'API)

Toute écriture passe par des fonctions `SECURITY DEFINER` ; l'écriture directe sur
les tables est refusée par la RLS. Les invariants sont en plus garantis par des
contraintes et triggers PostgreSQL :

| Réf | Règle | Garde en base |
|---|---|---|
| RM-004 | Unicité CNI | `UNIQUE (personne.numero_cni)` |
| RM-032 | Bénéfice unique / non-cumul | trigger sur `distribution` |
| RM-034 | Quota de campagne | trigger sur `decision` |
| RM-069 | Numéro de dossier unique | séquence + `UNIQUE`, format `PASS-2026-XXXXX` |
| RM-091 | Remise sur dossier validé | trigger sur `distribution` |
| RM-092 | Décision irréversible | trigger anti-UPDATE/DELETE sur `decision` |
| RM-097 / RM-111 | Terminal & IMEI uniques | `UNIQUE` |
| RM-151 | Journalisation | écriture `journal_audit` dans chaque RPC |
| RM-181 | Dossier probant obligatoire | contrainte **différée** sur `distribution` |
| RM-184/185 | Consentement obligatoire & adapté | contrôle dans `pass_soumettre_demande` |
| RM-197 | Séparation reçu / preuve | le reçu n'expose ni IMEI, ni géoloc, ni vérifications |
| — | Journal inaltérable | trigger anti-UPDATE/DELETE sur `journal_audit` |

## Base de données

Le schéma et les données de démonstration sont dans `supabase/migrations/`.
Pour recréer le projet ailleurs : appliquer les migrations dans l'ordre puis le
script de seed `supabase/seed.sql`.

## Déploiement

Voir `DEPLOIEMENT.md`.
