# Documentation — Plateforme PASS

Programme d'Accès aux Smartphones Subventionnés · ANSUT

## Liens

- **Application en ligne :** https://somet1010.github.io/pass-prototype/
- **Dépôt :** https://github.com/SOMET1010/pass-prototype

## Support de présentation (Conseil d'Administration)

- [`PASS_Presentation_Conseil_Administration.pptx`](./PASS_Presentation_Conseil_Administration.pptx) — 19 diapositives (mission, parcours, écrans de la plateforme, chaîne logistique, garanties, intégrations ANSUT, identité, périmètre, feuille de route). Le texte de présentation est aussi intégré en **notes du présentateur** sous chaque diapo.
- [`PASS_texte_presentation.txt`](./PASS_texte_presentation.txt) — le texte explicatif de la plateforme, section par section.

## Comptes de démonstration

Mot de passe commun : **`passdemo2026`**

| Rôle | Adresse e-mail | Accès |
| --- | --- | --- |
| Enrôlement | `enrolement@pass.demo` | Enrôlement des bénéficiaires |
| Instructeur | `instructeur@pass.demo` | Vérification & décision |
| Remise | `remise@pass.demo` | Remise des terminaux |
| **Superviseur** | `superviseur@pass.demo` | Supervision **+ toute la logistique** (commandes, réception, transferts, points mobiles, missions) |

> Les actions du module **Logistique** (créer une commande, réceptionner un colis, transférer du stock, ouvrir un point mobile, clôturer une mission) sont **réservées au rôle superviseur**. Les autres rôles voient le module en lecture seule.

## Rappel

Prototype de démonstration : les vérifications aux référentiels nationaux (ONECI, RSU, opérateurs, IMEI) sont **simulées**, aucune donnée réelle n'est traitée. Les règles métier et la logistique sont, elles, **effectives en base de données** et non contournables par l'API.
