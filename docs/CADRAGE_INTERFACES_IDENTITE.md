# Note de cadrage — Interfaces avec les registres d'identité & cas complexes

À l'attention de l'équipe de développement · établie à partir de :
- [`PASS_CDC_Interfaces_Identite_v4.docx`](./PASS_CDC_Interfaces_Identite_v4.docx) — CDC interfaces RNPP (ONECI) / CMU (CNAM) / RSU, *version pour concertation* (DTDI, 07/09/2026)
- [`PASS_Note_Identite_Cas_Complexes_v2.docx`](./PASS_Note_Identite_Cas_Complexes_v2.docx) — cas complexes, institution par institution (DTDI, 07/09/2026)

> **Statut.** Ces documents sont **soumis à concertation** avec les registres et l'ARTCI. Une large part relève d'accords institutionnels et juridiques (**CONCERT.**), pas du code. Cette note distingue ce qui est **implémentable maintenant côté programme (FIGÉ)** de ce qui **dépend de la concertation**, et donne des recommandations concrètes d'implémentation. **Aucun code n'a été modifié** dans ce lot (cohérent avec la passation).

---

## 1. Principes FIGÉS (à respecter dans toute implémentation)
1. **Minimisation** — PASS pose des **questions fermées** et reçoit des **réponses fermées** (verdicts). Aucune donnée de santé, de filiation, d'adresse, de revenu, de composition de ménage, ni de motif de vulnérabilité ne transite vers PASS.
2. **Équivalence des deux registres** — l'identité est prouvée par **NNI (RNPP/ONECI)** *ou* **numéro CMU (CNAM)**. Les deux voies produisent la **même éligibilité**. Aucune condition de nationalité *(à confirmer par le programme)*.
3. **Aucun rejet automatique** — une concordance partielle ou une donnée imparfaite **déclenche un traitement**, jamais une exclusion.

---

## 2. Contrat d'interface — les 5 services (à consommer en questions fermées)

| Service | Question | Réponses | Moment | Statut |
| --- | --- | --- | --- | --- |
| **I1 Existence** | Cet identifiant (NNI ou CMU) correspond-il à une personne enregistrée ? | OUI / NON / INCONNU / **À RÉGULARISER** | Dépôt | FIGÉ |
| **I2 Concordance** | Les nom, prénoms, date de naissance déclarés correspondent-ils ? | CONCORDANT / PARTIEL / DISCORDANT | Vérification | FIGÉ · seuils CONCERT. |
| **I3 Majorité** | 18 ans révolus à la date de la demande ? (sans transmettre la date) | OUI / NON | Vérification | FIGÉ |
| **I4 Biométrie** | L'empreinte présentée correspond-elle à l'identifiant ? | OUI / NON / INCONNU | **À la remise** | CONCERT. |
| **I5 Vulnérabilité (RSU)** | Relève-t-elle du seuil de vulnérabilité retenu par l'État ? | ÉLIGIBLE SOCIAL OUI / NON / INCONNU | Vérification | FIGÉ (principe) · CONCERT. (seuil, convention) |

**Données échangées** — entrée : réf. campagne + id dossier, identifiant (NNI/CMU), nom/prénoms/date **pour I2 seulement**, empreinte **pour I4 seulement** (jamais conservée par PASS), identifiant transmis au RSU **pour I5 seulement**. Sortie : verdict fermé + horodatage/réf. de contrôle + **code motif** (liste fermée) si INCONNU/PARTIEL. **Ne transitent jamais** : santé, droits CMU, adresse, filiation, photo, biométrie, nationalité, situation familiale/pro, revenu, composition du ménage, motif de vulnérabilité.

---

## 3. Statut « À RÉGULARISER » et parcours (FIGÉ — principe)

Quatre issues du contrôle d'identité :

| Résultat | Conséquence |
| --- | --- |
| Identité confirmée | Le parcours continue. |
| **INCONNU** | Demande suspendue ; orientation vers l'enrôlement — **CMU en priorité** (gratuit, de proximité). |
| **À RÉGULARISER** | **Pas de rejet.** Statut affiché : « éligibilité en attente — identité à régulariser ». Orientation vers l'institution compétente (ONECI/CNAM/RSU) ; le demandeur **reprend son parcours après régularisation, sans nouvelle candidature**. |
| Situation exceptionnelle | Procédure définie avec l'ARTCI et les institutions (voir §6). |

Cas couverts par À RÉGULARISER : absence/expiration/perte de CNI, SIM au nom d'un proche, KYC incomplet, personne connue d'un dispositif social mais peu documentée, personne absente des registres interrogés. **PASS ne crée pas d'identité** : il oriente et permet la reprise.

---

## 4. Unicité entre les deux registres (CONCERT.)
Une personne peut avoir NNI **et** numéro CMU. Pour tenir « un bénéficiaire, un terminal », trois voies, par ordre de préférence :
1. **I6 — LIEN** : le CMU renvoie le NNI associé (clé d'unicité unique).
2. À défaut, rapprochement sur **nom + prénoms + date de naissance**, avec traitement des cas partiels (jamais de rejet).
3. En dernier ressort, **biométrie I4 à la remise** empêche le double retrait sous deux identifiants.

---

## 5. Cas complexes — questions ouvertes par institution (CONCERT.)
- **RSU** : traitement des personnes vulnérables sans CNI ; identifiant fiable ménage/personne ; **verdict seul** (connu oui/non + seuil oui/non), jamais le dossier social.
- **CNAM** : enrôlement de masse en documentation imparfaite ; anti-doublons ; verdict de concordance sans données de santé ; procédure de régularisation utilisable comme parcours d'orientation.
- **ONECI** : procédure pour personne sans pièce ; verdict identité confirmée / non confirmée / régularisation nécessaire ; orientation/rendez-vous ; enrôlement mobile adossé aux campagnes.
- **ANStat** : mesurer le **risque de biais d'exclusion** des plus vulnérables ; cartographier faible équipement / pauvreté / faible connectivité.

---

## 6. Points de doctrine à trancher (ARTCI / gouvernance)
- **Numéro → identité (identification inversée)** : transmettre un numéro pour obtenir l'identité du titulaire est un traitement **de nature différente** (identification, pas confirmation). **Position recommandée : ne pas l'intégrer** au dispositif standard ; le soumettre à l'ARTCI. Principe : à objectif égal, retenir la solution la **moins intrusive** (« la ligne X est-elle rattachée à l'identité Y ? » → OUI/NON/INCONNU).
- **Cas d'exception** (SIM au nom d'un tiers, KYC ancien, données incohérentes) : base légale, acteurs autorisés, données retournées, conservation, traçabilité, droits du demandeur — **à encadrer avec l'ARTCI**.
- **Activation de la ligne à la remise** : titres admis par le décret n°2017-193 — la carte CMU n'en est pas un ; à confirmer avec l'ARTCI et à traiter dans le parcours.

---

## 7. Ciblage géographique — recadrage à intégrer
La note recadre la fonction du géographique : **l'éligibilité de principe reste nationale** ; la géographie **organise l'effort public** (où ouvrir des Points PASS, déployer des équipes mobiles, réserver des **contingents territoriaux explicites et transparents**) — **jamais un score caché** ni un filtre d'éligibilité par zone.

> **Impact sur le prototype** : le module *Ciblage géographique* existant (filtres d'exclusion + score + quotas) doit être relu à cette lumière — le conserver comme **outil d'allocation/organisation** (contingents transparents), et non comme filtre d'éligibilité individuelle. À arbitrer par la gouvernance.

---

## 8. Écart prototype ↔ spécification (pour l'implémentation)

| Élément | Prototype actuel | À faire |
| --- | --- | --- |
| Champs `nni` **et** `numero_cmu` | ✅ présents sur `personne` | — |
| **Équivalence NNI/CMU** (identité par l'un ou l'autre) | ⚠️ contrôle identité unique | Accepter l'un ou l'autre ; mémoriser le registre utilisé |
| Contrôle I1 à **4 états** dont **À RÉGULARISER** | ❌ 3 états | Ajouter l'état + le parcours de régularisation (statut affiché, reprise sans nouvelle candidature) |
| I2 concordance PARTIEL → attente/correction | ⚠️ « à instruire » générique | Distinguer PARTIEL (confirmer/corriger, second passage) |
| I3 majorité fermée (sans DOB) | ✅ (calcul interne) | Garder verdict fermé |
| I5 verdict seul | ✅ (contrôle ayant droit) | — |
| **Catalogue registres** RNPP/CMU/RSU + services I1–I5, modes **lots/à l'unité**, délais | ⚠️ `source_externe` partiel | Étendre le catalogue + mode par lots (référence pilote) |
| **Minimisation** vérifiable (verdicts fermés + codes motif) | ⚠️ `donnees_retour` libre (simulé) | Restreindre aux verdicts + codes motif fermés |
| Unicité **NNI↔CMU** | ⚠️ non-cumul par personne | Rapprocher les deux clés (I6-LIEN, sinon nom/prénoms/DOB, sinon I4) |
| **I4 biométrie** à la remise | ❌ | CONCERT. (convention + matériel) |

**Recommandations d'implémentation (côté programme, portable) :**
1. Modéliser le **contrat I1–I5** comme des vérifications à **verdict fermé** (enum) + **code motif** (liste fermée) ; interdire tout champ libre porteur de données personnelles (minimisation vérifiable).
2. Ajouter l'état **À RÉGULARISER** au contrôle d'identité et un **état de demande** correspondant (« en attente — identité à régulariser ») avec orientation + reprise, sans re-candidature.
3. Rendre l'identité **équivalente** sur NNI ou CMU ; stocker le registre de preuve utilisé.
4. Étendre `source_externe` : `rnpp` (ONECI), `cmu` (CNAM), `rsu` — chacun avec ses services I1–I5, mode (lots/unité), délai ; le mode « lots » comme référence pilote.
5. Prévoir un **rapprochement d'unicité** entre NNI et CMU (I6-LIEN prioritaire).
6. Laisser **I4 biométrie**, l'**identification inversée** et les **cas d'exception** en points de concertation ARTCI (ne pas coder par défaut).

---

## 9. Ce que PASS ne demande jamais
Un accès aux bases, une extraction, une liste ; une donnée de santé ou le détail d'un dossier social ; un engagement immédiat des registres (la faisabilité est l'objet de la concertation).
