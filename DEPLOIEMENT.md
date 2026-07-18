# Déploiement du prototype PASS

Le **backend est déjà en ligne** : projet Supabase `PASS-prototype`
(`gkxmopdyudfuadhxyuwe`, région eu-west-3), schéma + règles + jeu de données
appliqués. Il ne reste qu'à publier le **frontend** (application web statique).

L'application est un SPA statique (build en fichier unique) : n'importe quel
hébergement statique convient. Trois options, de la plus simple à la plus contrôlée.

## Option A — Vercel (la plus rapide, dépôt privé accepté)

1. Créez un dépôt GitHub (ex. `pass-prototype`) et poussez-y ce code.
2. Sur https://vercel.com → *Add New Project* → importez le dépôt.
3. Framework : **Vite**. Variables d'environnement :
   - `VITE_SUPABASE_URL = https://gkxmopdyudfuadhxyuwe.supabase.co`
   - `VITE_SUPABASE_ANON_KEY = sb_publishable_obATqwU7EFZ3fMT98LvOZg_OUfB09oo`
4. *Deploy*. Vercel fournit une URL partageable.

## Option B — GitHub Pages (gratuit, dépôt public)

1. Créez un dépôt **public** `pass-prototype` et poussez ce code.
2. Le workflow `.github/workflows/deploy.yml` est déjà inclus : il build et publie
   automatiquement à chaque push sur `main`.
3. Dans *Settings → Pages*, source = **GitHub Actions**.
4. L'URL est `https://<compte>.github.io/pass-prototype/`.

> Note : sur GitHub Pages en sous-chemin, l'application utilise déjà un routage par
> `#` (HashRouter), donc les liens profonds fonctionnent sans configuration.

## Option C — Local / preview

```bash
bun install
bun run build && bun run preview   # http://localhost:4173
```

## Configuration Supabase Auth (URL de redirection)

Aucune redirection e-mail n'est utilisée (connexion par mot de passe), donc aucune
configuration d'URL de redirection n'est nécessaire pour la démonstration.

## Recréer le backend ailleurs

1. Créer un projet Supabase.
2. Appliquer `supabase/migrations/*.sql` dans l'ordre chronologique.
3. Exécuter `supabase/seed.sql` (en une transaction).
4. Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
