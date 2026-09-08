# PASS v2 — Brief de refonte (destiné à Lovable)

**Programme d'Accès aux Smartphones Subventionnés — ANSUT (Côte d'Ivoire)**
Version doctrine : DTDI, 7 septembre 2026 (« Le parcours de l'usager » + « Logigramme d'identification »).
Statut : prototype de démonstration — données fictives, référentiels **simulés**, mention « SIMULÉ » visible partout.

---

## 0. Comment utiliser ce brief
Ce document est la **spécification unique** de la refonte. Il sert à la fois de prompt de construction pour Lovable
(UI) et de contrat pour le backend. **Recommandation : ne pas régénérer le backend** — se connecter au **Supabase
existant** (moteur défendable déjà en place) et consommer ses fonctions `pass_*`.

## 1. Objectif produit
Refaire l'expérience PASS pour qu'elle **reflète exactement** le logigramme officiel d'identification/éligibilité et
le parcours en 14 étapes, avec une navigation claire et un moteur d'éligibilité conforme à la doctrine
« non servi ≠ rejet ».

## 2. Pile technique
- **Frontend** : React + TypeScript + Tailwind (Lovable). Rendu institutionnel sobre.
- **Backend** : **Supabase existant** (PostgreSQL + Auth + RLS + Edge Functions). Ne pas recréer les tables/règles ;
  appeler les fonctions `pass_*` (SECURITY DEFINER). Toute écriture sensible passe par une fonction, jamais par un
  INSERT/UPDATE direct depuis le client.
- **Auth** : e-mail/mot de passe (Supabase Auth). 4 rôles (voir §4).

## 3. Identité visuelle
- Bleu institutionnel ANSUT `#0B57A4` / `#083E77`, orange accent **mesuré** `#DE6F14`, neutres à teinte froide.
- Bandeau permanent « Prototype de démonstration — vérifications simulées, données fictives ». Badge « SIMULÉ » sur
  toute donnée issue d'un référentiel simulé.
- Accessibilité : contrastes AA, focus visibles, responsive (jusqu'à ~280 px).

## 4. Rôles & séparation des tâches
- **Enrôlement**, **Instructeur**, **Remise**, **Superviseur**.
- Règles imposées en base (à respecter côté UI) : la décision est réservée à instructeur/superviseur ;
  l'enrôleur ne peut pas remettre le terminal qu'il a enrôlé ; consentement recueilli avec **preuve** (signature ou
  témoin) — public analphabète pris en charge.

## 5. Architecture de l'information (navigation)
Menus groupés + **fil d'Ariane** (Accueil › Groupe › Page) sur chaque écran :
- **Quotidien** : Accueil · Enrôlement · Dossiers · Instruction · Recherche
- **Distribution** : Logistique · Stock · SAV
- **Gouvernance** : Ciblage géo. · Paramètres · Simulateur · Supervision
- **Aide** : À propos

## 6. LE MOTEUR — logigramme d'identification/éligibilité (spécification exacte)
Séquence de **6 questions fermées**. Chaque question renvoie un **verdict fermé** (jamais un dossier ni une donnée
sous-jacente). Deux natures de sortie :

**Sorties ROUGES — définitives, bloquantes, sans recours :**
1. **I3 — Majorité** : moins de 18 ans → NON ÉLIGIBLE.
2. **Unicité** (déjà bénéficiaire PASS) → NON ÉLIGIBLE (« un bénéficiaire, un terminal »).
3. **S1/S2 — Smartphone actif** détecté sur la ligne → NON ÉLIGIBLE. *(bloquant, pas un critère de score)*
4. **I5 — Vulnérabilité (RSU)** non retenue → NON ÉLIGIBLE.

**Sorties ORANGE — provisoires, ramènent au point d'arrêt (jamais un rejet) :**
1. **I1 — Identité INCONNU** → orientation enrôlement (CMU en priorité, gratuit / ONECI) → réexamen après enrôlement.
2. **I1/I2 — À RÉGULARISER** (existe en principe mais dossier non confirmable) → orientation ONECI/CNAM →
   **reprise sans nouvelle candidature**.
3. **S1/S2 — Information opérateur insuffisante** → EN ATTENTE, relance opérateur.
4. **I5 — Vulnérabilité INCONNU** → EN ATTENTE, relance RSU.

Ordre des questions : `I1 identifiant reconnu → I2 concordance → I3 majorité → unicité → S1/S2 smartphone actif →
I5 vulnérabilité → ÉLIGIBLE`.

**Voie d'identité alternative** : si I1 échoue sur le RNPP, PASS interroge la **CMU** ; I2/I3 se vérifient alors sur
la base CMU (parité avec le RNPP).

**Après ÉLIGIBLE → Ordre d'attribution** : classement selon des **critères publics** (pas de premier arrivé). Puis :
- **Terminal disponible dans la vague ?** OUI → invité à finaliser (quote-part → remise après **biométrie I4**) →
  BÉNÉFICIAIRE.
- NON → **DEMANDE ACTIVE** : rien payé, **pas de refus**, prioritaire à la vague suivante.

> **Règle d'or à coder sans exception :** aucune sortie orange n'est un rejet ; le quota épuisé n'est **jamais** un
> refus ; un refus ne peut venir que d'une des 4 sorties rouges.

## 7. Score & priorité (ordre d'attribution)
Le **score** ne décide **pas** l'éligibilité — il sert uniquement à **classer les éligibles**. Score C1–C5 pondéré
(poids administrables, somme 100) → rang **P1–P4**. Seuils paramétrables. Le score n'est calculé que pour un dossier
éligible.

## 8. Objets à ajouter au modèle (deltas vs prototype actuel)
1. **Verdict d'identité** à 4 états : `confirmée` / `inconnu` / `a_regulariser` / `exception`.
2. **Voie d'identité** : `rnpp` | `cmu`.
3. **Statut de dossier** : ajouter `demande_active` (éligible non servi) distinct de `refus`.
4. **Lots de terminaux** : `essentiel` (quote-part 9 900 F) / `plus` (NFC, 14 900 F). Le profil d'usage détermine le lot.
5. **Quote-part** : appelée **après réservation**, avant remise.
6. **Biométrie (I4)** à la remise ; activation du terminal à la remise (jamais avant).
7. **Taxonomie de services** nommée : I1 existence, I2 concordance, I3 majorité, I4 biométrie, I5 vulnérabilité (+ I6),
   S1 rattachement ligne, S2 usage smartphone, S3 activation (+ S4).

## 9. Écrans à livrer
1. **Connexion** (+ démo guidée).
2. **Accueil / tableau de bord** — cartes Quotidien / Distribution / Gouvernance, indicateurs, parcours.
3. **Enrôlement** — saisie assistée + lecture de pièce (OCR simulé), voie RNPP/CMU, consentement avec preuve,
   chronomètre < 1 min.
4. **Dossier / éligibilité** — le logigramme rendu lisible : 6 contrôles, verdict, sorties rouges/oranges,
   orientation & reprise, score → rang.
5. **Instruction** — file des dossiers « à instruire » / « à régulariser » / « en attente », avec l'action de recours.
6. **Ordre d'attribution & invitation** — classement public, réservation, quote-part, invitation.
7. **Remise** — biométrie I4, scan IMEI/QR, activation, reçu scellé (SHA-256).
8. **Logistique** — commande → arrivage → entrepôt → transfert → mission → remise (traçabilité IMEI), lots.
9. **Stock** — points fixes/mobiles, cartographie, seuils d'alerte.
10. **SAV** — panne / remplacement / désactivation, rattaché au dossier.
11. **Ciblage géographique** — 3 filtres, score, quotas + réserve motivée, pop. éligible = pop × taux de pauvreté.
12. **Paramètres** — poids/seuils/clés administrables, versionnés, motivés ; contrôle Σ poids=100 et P1≥P2≥P3 ;
    modes d'accès des sources.
13. **Simulateur** — éprouver le logigramme sans créer de dossier (verdict + rang en direct).
14. **Supervision** — SLA, journal d'audit inaltérable, vélocité des remises, conformité.
15. **À propos** — statut prototype, mentions.

## 10. Les 8 personas (données de démonstration)
| Persona | Cas | Issue attendue |
|---|---|---|
| **Awa** | rurale, identité RNPP, pas de smartphone | SERVIE — lot 1 |
| **Koffi** | éligible, mais quota de vague épuisé | ÉLIGIBLE, **demande active** (non servi) |
| **Fatou** | pas de pièce RNPP exploitable, identité via **CMU** | SERVIE — identité par la CMU |
| **Ibrahim** | pièce expirée / enregistrement incomplet | **À RÉGULARISER** — éligibilité en attente |
| **Yacouba** | profil d'usage plus élevé (NFC) | SERVI — lot 2 |
| **Aya** | 16 ans | NON ÉLIGIBLE (majorité — sortie rouge) |
| **Moussa** | utilise déjà un smartphone 4G | NON ÉLIGIBLE (smartphone actif — sortie rouge) |
| **Cas d'exception** | ligne au nom d'un tiers, KYC incohérent | SITUATION EXCEPTIONNELLE (procédure ARTCI, hors parcours) |

## 11. Invariants de confidentialité (à ne jamais violer)
- Questions fermées, réponses fermées : **aucun dossier ni donnée sous-jacente** ne transite vers PASS.
- Aucune donnée de santé, de revenu, de composition du ménage ou de motif de vulnérabilité côté PASS.
- Pas de rejet automatique sur information partielle : à défaut de certitude, le dossier **attend**.
- Jamais de recherche inversée « qui est ce numéro ? » auprès de l'opérateur.
- Quote-part jamais appelée avant réservation d'un terminal ; activation seulement à la remise, après biométrie.

## 12. Hors périmètre / simulé (à afficher honnêtement)
- Référentiels ONECI / RNPP / RSU / CMU / opérateurs : **simulés** (conventions à signer).
- Hébergement souverain : hors périmètre prototype.
- Signature qualifiée / horodatage cryptologique : bascule « simulé » sans identifiants.

## 13. Contrat backend (Supabase existant — à réutiliser)
Appeler les RPC `pass_*` plutôt que d'écrire en direct. Exemples clés (liste complète dans le projet Supabase) :
`pass_enroler`, `pass_maj_piece`, `pass_lancer_verifications`, `pass_evaluer_demande` *(à faire évoluer sur le
logigramme)*, `pass_mettre_en_instruction`, `pass_prononcer_decision`, `pass_enregistrer_consentement`,
`pass_effectuer_remise`, `pass_activer_terminal`, `pass_sceller`, `pass_calculer_ciblage_geo`, `pass_arbitrer_reserve`,
`pass_param_maj`, `pass_source_maj`, `pass_notifier_sms`. RLS active ; helpers `current_agent_role()`,
`is_active_agent()`.

## 14. NE RIEN PERDRE — actifs à préserver et à porter (exigence de premier rang)
La refonte est **non destructive**. Le prototype actuel reste en ligne et sous git (repère/tag de gel posé avant de
commencer). Les actifs suivants sont **conservés** (backend) ou **portés à l'identique** (frontend) sur la nouvelle UI :

- **Démo parlante (priorité absolue)** : la visite guidée auto-jouée où l'agent **parle et opère l'écran**
  (curseur animé, frappe, clics, sélections). À **reporter** sur les nouveaux écrans — mêmes mécanismes, mêmes textes
  narrés, même voix. Prévoir des repères `data-demo="…"` sur chaque élément piloté (champs d'enrôlement, bouton
  d'évaluation, contrôles du simulateur, volume/calcul du ciblage, etc.).
- **Voix institutionnelle** : Edge Function **`ansut-voix`** (Azure OpenAI TTS, voix **Sage**) — **backend, intacte** ;
  utilisable telle quelle depuis la nouvelle UI. Repli automatique sur la voix du navigateur si indisponible.
- **Comparateur de voix** (page `/comparateur-voix`) : à reporter.
- **Backend défendable complet** (à réutiliser, ne pas régénérer) : snapshot SHA-256, annulation append-only, quota
  atomique, séparation des tâches, 43 fonctions `pass_*`, logistique, `ansut-hub` (notifications), `ansut-cachet`
  (cachet). 
- **Mode démonstration lançable de partout** (bouton flottant + écran de connexion).

> Règle : aucune fonctionnalité existante ne disparaît en refonte ; elle est soit conservée (backend), soit portée
> (frontend). La **démo parlante doit être opérationnelle** sur la nouvelle plateforme avant de considérer la refonte
> terminée.

---

*Ce brief est la source de vérité de la refonte. La phase 1 (alignement du moteur en base sur le logigramme) est
réalisée côté Supabase avant/parallèlement à la construction de l'UI Lovable. Rien du prototype actuel n'est supprimé :
il reste en ligne comme référence et filet de sécurité.*
