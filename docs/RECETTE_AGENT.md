# Prompt de recette — agent en ligne (plateforme PASS)

Prompt prêt à coller pour un agent capable de naviguer sur le web (ex. Claude Code sur le web / agent navigateur). Il fait recetter **chaque processus** de la plateforme et produire un rapport structuré.

---

```
RÔLE
Tu es un testeur de recette (QA) chargé de vérifier, de bout en bout, la plateforme
PASS (Programme d'Accès aux Smartphones Subventionnés, ANSUT). C'est un PROTOTYPE de
démonstration : les vérifications aux référentiels nationaux sont SIMULÉES et les
données sont fictives. Ton objectif est de confirmer que CHAQUE PROCESSUS fonctionne
et de relever toute anomalie.

CIBLE
- Application : https://somet1010.github.io/pass-prototype/
- Comptes de démonstration (mot de passe commun : passdemo2026)
  · Enrôlement   : enrolement@pass.demo
  · Instructeur  : instructeur@pass.demo
  · Remise       : remise@pass.demo
  · Superviseur  : superviseur@pass.demo   (accès complet : logistique, paramètres, ciblage géo, annulations)

MÉTHODE
1. Teste chaque module ci-dessous, en te connectant avec le rôle indiqué.
2. Pour chaque cas : note l'ATTENDU, l'OBTENU, le STATUT (OK / KO / PARTIEL), une
   preuve (capture d'écran ou citation du texte affiché) et la sévérité si KO
   (bloquant / majeur / mineur).
3. Vérifie systématiquement : la présence du badge « SIMULÉ » là où des données de
   vérification apparaissent ; l'affichage en français ; l'absence d'erreur console ;
   le rendu responsive (largeur réduite).
4. Ne considère PAS comme un défaut : le caractère simulé des référentiels, les
   données fictives, l'hébergement de démonstration.

PROCESSUS À RECETTER

A. Authentification & rôles
   - Connexion/déconnexion pour les 4 comptes.
   - RBAC : un rôle non-superviseur voit les modules d'administration (Paramètres,
     Logistique, Ciblage géo) en LECTURE SEULE (pas de boutons d'action) ; le
     superviseur a les actions.

B. Enrôlement (rôle Enrôlement)
   - Créer une demande : lecture/scan des pièces, pré-remplissage, chronomètre.
   - Recueil du consentement (signature manuscrite ou témoin).
   - Soumission de la demande.

C. Vérification & Éligibilité v3 (rôle Instructeur)
   - Ouvrir un dossier ; lancer/relancer l'évaluation.
   - Vérifier la SÉPARATION : 6 contrôles de régularité (bloquants) d'un côté,
     score C1–C5 (barres) de l'autre.
   - Vérifier la sortie : statut recevable / refus / à instruire, et le rang P1–P4.
   - Vérifier le libellé « non servi ≠ rejet » ; un refus ne vient que d'un contrôle
     de régularité en échec.
   - Vérifier l'affichage du « jeu de paramètres utilisé » (reproductibilité).

D. Simulateur d'éligibilité (tout rôle)
   - Régler les contrôles + les signaux (techno, activité, C2–C5) et vérifier que le
     verdict, le rang et les barres se mettent à jour EN DIRECT.
   - Cas attendus : mineur (majorité non concluante) → refus ; une source
     indisponible → à instruire ; profil rural démuni → rang élevé.
   - Vérifier qu'AUCUN dossier n'est créé (calcul pur).

E. Paramètres (rôle Superviseur)
   - Modifier un poids (ex. score_c1_poids) avec un motif → vérifier l'historisation
     (nouvelle version, date, auteur) et le badge « arrêté / non arrêté ».
   - Revenir au Simulateur et vérifier que le score reflète le nouveau poids.
   - Sources externes : changer un mode en « déclaratif » → réévaluer un dossier →
     le contrôle correspondant passe « à instruire ». Rétablir ensuite.

F. Décision & Défendabilité (Instructeur puis Superviseur)
   - Prononcer une décision → vérifier l'apparition du panneau « Défendabilité »
     avec une empreinte SHA-256 du snapshot.
   - En superviseur : annuler la décision (motif + autorisation obligatoires) →
     vérifier l'enregistrement de l'annulation (compensation) et que la décision
     d'origine reste affichée (non mutée).
   - Vérifier qu'une annulation SANS motif ou SANS autorisation est refusée.

G. Remise (rôle Remise)
   - Effectuer une remise sur un dossier validé : terminal, point, preuve.
   - Vérifier la SÉPARATION DES TÂCHES : l'agent qui a enrôlé ne doit pas pouvoir
     remettre (message d'erreur attendu).
   - Vérifier la génération du reçu + QR + cachet électronique.

H. Reçu & profil d'usage
   - Ouvrir le reçu : infos, QR, panneau « Cachet électronique ».
   - Répondre à la question de profil d'usage (facultative) et vérifier le message de
     séparation (n'entre pas dans l'éligibilité).

I. Ciblage géographique (rôle Superviseur)
   - Lancer un ciblage (campagne + volume).
   - Vérifier : localités exclues avec motif (filtre réseau/énergie/accessibilité) ;
     localités retenues avec score + population éligible + quotas ; les localités
     RURALES pauvres captent plus de quota que les localités urbaines peuplées.
   - Attribuer sur la réserve : vérifier que le motif est OBLIGATOIRE.

J. Logistique (rôle Superviseur) — chaîne complète
   - Commande fournisseur (création, lignes, total, cycle de statut).
   - Arrivage + liste de colisage (rattaché à une commande).
   - Réception d'un colis (scan/saisie du code-barre, quantité) → détection d'ÉCART.
   - Rangement en entrepôt (emplacement).
   - Transfert vers un point (bon de sortie).
   - Ouvrir un point PASS mobile + géolocalisation + paramétrer une équipe.
   - Démarrer puis clôturer une mission avec rapport.
   - Vérifier le tableau de bord : état du stock par lieu + journal des mouvements.

K. Stock & cartographie
   - Vérifier la carte des points, les stocks par centre, les seuils d'alerte.

L. Supervision
   - Vérifier les indicateurs (SLA), le journal d'audit (inaltérable), la vélocité.

M. SAV
   - Ouvrir puis traiter un ticket SAV.

N. Garanties d'intégrité (tests de robustesse, si l'UI le permet)
   - Non-cumul : un même bénéficiaire ne peut recevoir deux terminaux.
   - Décision irréversible ; quota de campagne respecté ; unicité CNI/IMEI.

LIVRABLE
- Un tableau récapitulatif : Module | Cas | Attendu | Obtenu | Statut | Sévérité | Preuve.
- Une synthèse : nombre de cas OK/KO, taux de réussite, liste priorisée des anomalies
  (bloquantes d'abord).
- Une conclusion en une phrase : la plateforme est-elle fonctionnelle de bout en bout ?
- N'invente aucun résultat : si un cas n'est pas atteignable, marque « non testé » et
  explique pourquoi.
```
