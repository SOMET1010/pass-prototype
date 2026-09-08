# Brief de démonstration — Plateforme PASS

À coller à un agent navigateur (ou à utiliser tel quel avec le Mode Démonstration intégré).

## 1. URL du site
https://somet1010.github.io/pass-prototype/

## 2. Compte de démonstration
- **Superviseur (accès complet)** : `superviseur@pass.demo` / `passdemo2026`
- (optionnels, pour montrer les rôles/séparation des tâches) : `enrolement@pass.demo`, `instructeur@pass.demo`, `remise@pass.demo` — même mot de passe.

> Prototype de démonstration : données fictives, vérifications aux référentiels **simulées** (badge « SIMULÉ »).

## 3. Scénario en français (persona : « Awa Koné »)

1. **Connexion & accueil** — Se connecter en superviseur. *« Bienvenue sur PASS, le Programme d'Accès aux Smartphones Subventionnés de l'ANSUT. Voici le tableau de bord : la mission, les indicateurs du jour et le parcours du bénéficiaire. »*
2. **Éligibilité v3 (sur un dossier)** — Ouvrir un dossier depuis « Dossiers » → « Vérification ». *« La vérification d'éligibilité version 3 : à gauche les contrôles de régularité, bloquants ; à droite le score sur cinq dimensions, qui donne un rang de priorité P1 à P4. Un refus ne peut venir que d'un contrôle en échec, jamais d'un score faible. »*
3. **Défendabilité** — Montrer le panneau « Défendabilité ». *« Chaque décision est figée dans un cachet reproductible, avec une empreinte SHA-256 : elle reste défendable des mois plus tard, et corrigible par une annulation tracée. »*
4. **Simulateur — le cas d'Awa** — Aller sur « Simulateur ». Régler : ligne 2G, dernière activité ancienne, vulnérabilité élevée. *« Simulons la situation d'Awa, en zone rurale, sans smartphone utilisable. Le rang se calcule en direct, sans créer de dossier. »* Puis changer un poids. *« Si la gouvernance ajuste un poids, le classement s'adapte immédiatement — tout est paramétrable. »*
5. **Paramètres** — Aller sur « Paramètres ». *« Les poids, les seuils et les modes d'accès aux registres sont administrables, versionnés et horodatés : rien n'est codé en dur. »*
6. **Ciblage géographique** — Aller sur « Ciblage géo. ». *« Trois filtres, un score de priorisation, puis les quotas : les localités rurales défavorisées sont priorisées, avec une réserve d'arbitrage toujours motivée. »*
7. **Carte des Points PASS** — Aller sur « Stock ». *« La cartographie des points de retrait et l'état des stocks, avec les seuils d'alerte. »*
8. **Attribution / logistique** — Aller sur « Logistique ». *« De la commande fournisseur à la mission de terrain, chaque terminal est tracé par son IMEI. »*
9. **Supervision** — Aller sur « Supervision ». *« Les délais de service, le journal d'audit inaltérable et la conformité. »*
10. **Conclusion** — Aller sur « À propos ». *« PASS : un parcours vérifié, prouvé et inclusif. Merci. »*

> Variante « inscription réelle d'Awa » (si l'agent doit créer des données) : se connecter en `enrolement@`, cliquer « Enrôlement », saisir Awa Koné, recueillir le consentement, soumettre ; puis `instructeur@` pour la vérification. À réserver à une démo qui accepte d'écrire dans la base de démonstration.

## 4. Fonctionnalités à absolument montrer
1. **Éligibilité v3** : régularité (bloquante) séparée du score **C1–C5** → **rang P1–P4** ; « non servi ≠ rejet ».
2. **Simulateur** : calcul en direct, sans persistance, sensible aux paramètres.
3. **Paramètres administrables versionnés** (poids/seuils + modes d'accès des sources).
4. **Défendabilité** : snapshot de décision + empreinte SHA-256 + annulation compensatoire.
5. **Ciblage géographique** : priorisation du rural défavorisé + réserve d'arbitrage motivée.
6. **Logistique de bout en bout** : commande → réception → entrepôt → transfert → point mobile → mission (traçabilité IMEI).
7. **Cartographie & stock** des Points PASS.
8. **Supervision** : SLA + journal d'audit inaltérable.
9. **Mention SIMULÉ** partout (honnêteté du prototype).

## 5. Consignes à l'agent
- Attendre le chargement de chaque écran avant de commenter/cliquer.
- Surligner l'élément décrit quand c'est possible.
- Ne rien présenter comme « réel » : rappeler que les référentiels sont simulés.
- En cas d'élément introuvable, passer à l'étape suivante et le signaler, sans inventer.
