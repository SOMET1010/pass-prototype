# Programme PASS — Note de présentation du prototype

**Programme d'Accès au Smartphone Subventionné (PASS) · ANSUT**
*Prototype de démonstration — vérifications simulées, données fictives, non destiné à la production.*

---

## 1. Le problème que PASS résout

En Côte d'Ivoire, le téléphone est présent dans la plupart des foyers, mais l'accès **personnel** au
smartphone reste très inégal : en milieu rural, ~84 % des ménages disposent d'un téléphone, mais
seulement **29,6 % des individus** en possèdent un personnellement. C'est cet écart — entre équipement
du ménage et possession individuelle — qui prive une large part de la population d'un accès individuel
aux services numériques (mobile money, services publics, éducation, santé).

PASS subventionne l'acquisition de smartphones pour des bénéficiaires identifiés, prioritairement les
ayants droit des programmes sociaux publics.

- **Cible 2026 :** 35 000 à 50 000 terminaux
- **Régime de croisière :** ~120 000 terminaux / an
- **Lancement du programme :** 15 septembre 2026

## 2. L'enjeu central : la gestion des ayants droit

PASS n'est pas une distribution de téléphones, c'est **l'attribution d'une subvention publique à des
personnes qui y ont droit**. Pour chaque demande, quatre questions doivent trouver réponse :

| Question | Vérification | Source |
|---|---|---|
| Est-ce bien la bonne personne ? | Identité, pièce valide | ONECI *(simulé)* |
| A-t-elle droit au programme ? | Statut d'ayant droit social | RSU *(simulé)* |
| N'a-t-elle pas déjà bénéficié ? | Historique des attributions | **Référentiel PASS (réel)** |
| Relève-t-elle du périmètre ouvert ? | Zone, quota, campagne active | Paramétrage de campagne |

Trois exigences simultanées structurent tout le dispositif : **donner à la bonne personne**, **prouver
ce qui a été fait**, et **ne pas exclure** les publics fragiles (souvent ruraux, parfois analphabètes).

## 3. Ce que le prototype démontre

Un parcours complet, crédible et fidèle au fonctionnement réel :

**Enrôlement → Vérification d'éligibilité → Décision → Remise du terminal → Reçu bénéficiaire**, plus la
**supervision** (indicateurs, avancement par zone, journal d'audit, activité par agent).

Points forts démontrés :

- **Le système recommande, l'agent décide.** Le moteur calcule *éligible / non éligible / à instruire*
  à partir des quatre contrôles ; la décision reste humaine et publique.
- **Les règles critiques sont effectives en base de données**, pas seulement à l'écran : identité unique,
  IMEI unique, non-cumul (une personne ne bénéficie qu'une fois), respect du quota, décision
  irréversible, dossier probant obligatoire à chaque remise. **Un contournement par l'API est bloqué par
  la base elle-même.**
- **Traçabilité inaltérable** : chaque création, décision et remise est journalisée ; le journal ne peut
  être ni modifié ni supprimé.
- **Inclusion** : consentement adapté (« assisté avec témoin » pour les personnes ne pouvant lire ou
  signer), preuve de remise multi-facteurs (photo + IMEI + agent + horodatage) plutôt qu'une signature.
- **Séparation reçu / dossier probant** : le bénéficiaire repart avec un ticket simple + QR code ; les
  données sensibles restent dans le système.

## 4. Ce que le prototype ne démontre pas (et pourquoi)

Ces limites ne sont **pas techniques mais institutionnelles** — elles relèvent d'un autre chantier :

- **Connexions réelles aux référentiels** (ONECI, RSU, opérateurs, registre IMEI) : les accès se
  négocient par conventions et habilitations juridiques. Toutes ces vérifications portent un badge
  **« SIMULÉ »** bien visible.
- **Chaîne de preuve matérielle** (scan IMEI par lecteur, GPS certifié, photo horodatée opposable) :
  hors de portée d'un prototype web.
- **Hébergement souverain** : exigé pour la production, non disponible sur la stack de démonstration —
  mentionné explicitement dans l'application.
- **Biométrie / reconnaissance faciale** : cadre juridique non validé, volontairement exclu.

## 5. À quoi sert ce prototype

- **Montrer** le parcours aux décideurs pour obtenir arbitrages et financements.
- **Valider l'ergonomie** avec les agents de terrain.
- **Fixer les choix fonctionnels** avant le développement de production par un intégrateur.

## 6. Essayer la démonstration

Application : **https://somet1010.github.io/pass-prototype/**
Comptes (mot de passe `passdemo2026`) : `enrolement@`, `instructeur@`, `remise@`, `superviseur@pass.demo`
(le compte *superviseur* déroule tout le parcours à lui seul).

| Persona | Situation | Issue attendue |
|---|---|---|
| Mariam KOUASSI | Éligible complète | ÉLIGIBLE → reçu |
| Adama TRAORÉ | A déjà bénéficié (2024) | NON ÉLIGIBLE (non-cumul) |
| Awa DIALLO | Sans ligne mobile | À INSTRUIRE |
| Koffi Yao | Nom opérateur ≠ pièce | À INSTRUIRE |
| Fatou COULIBALY | Consentement assisté | ÉLIGIBLE |

---

*Document de présentation — prototype de démonstration. Données et identifiants fictifs.*
