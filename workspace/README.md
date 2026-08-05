# Pilotage PASS — Workspace de programme

> **Outil interne de gestion du programme PASS**, porté par l'ANSUT.
> Distinct de la plateforme opérationnelle PASS. **Aucune donnée de bénéficiaire**
> n'est manipulée : uniquement des données de pilotage (décisions, jalons,
> chantiers, actions, risques, documents, partenaires, séances).

Ce workspace permet à l'équipe programme de **suivre l'avancement**, de **tracer
les décisions** et de disposer en un seul endroit de l'intégralité du programme.
La feuille de route est pilotée « intelligemment » : l'outil calcule en continu
ce qui **bloque**, ce qui **glisse** et ce qui **vient**, en appliquant la règle
qui gouverne le calendrier PASS — *aucun retard ne se rattrape en aval*.

## Ce que fait l'outil

| Module | Rôle |
|---|---|
| **Tableau de bord** | Santé du programme, alertes prioritaires, prochains jalons, à traiter sous 10 jours, avancement par chantier |
| **Décisions** | Registre (priorité n°1) — instance, échéance, ce que la décision conditionne, jalons débloqués, filtre « bloquantes » |
| **Jalons** | Frise chronologique (Gantt), jalons décisifs, dépendances, **chaîne aval** (ce qu'un retard décale), jalons menacés |
| **Chantiers** | 8 chantiers + coordination transverse, référent, avancement agrégé |
| **Tâches** | Liste + **Kanban**, responsable, échéance, priorité, dépendances, avancement, **diligence** (relances) |
| **Risques** | Registre RAID — gravité, probabilité, maîtrise, parade |
| **Documents** | Référentiel versionné, lien externe ou dépôt, confidentialité (masqué aux observateurs) |
| **Partenaires** | Institutions / opérateurs / fournisseurs, statut de la relation, **génération de notifications** (brouillons e-mail) |
| **Séances** | Comités (opérationnel, DG, pilotage, CA) — ordre du jour, relevé, actions générées |

### Pilotage intelligent (`src/lib/roadmap.ts`)
- décisions bloquantes non rendues, triées par urgence ;
- jalons menacés = décision en attente **ou** tâche amont en retard, avec la cause ;
- tâches en retard / imminentes / bloquées ;
- chaîne aval d'un jalon (impact d'un glissement) ;
- avancement par chantier et global, santé du programme (rouge / orange / vert).

### Notifications & diligence (`src/lib/notifications.ts`)
L'outil **prépare** les messages (objet + corps en français) pour solliciter ou
relancer un partenaire, et pour relancer un responsable de tâche. L'envoi effectif
reste une action humaine validée (copie, `mailto:`, ou branchement messagerie ultérieur).

## Rôles

Authentification par rôle (démonstration ; annuaire d'entreprise branchable ensuite) :
chef de programme, référent de chantier, comité de pilotage, Direction Générale,
observateur (lecture seule, sans documents confidentiels).

## Données

Les données initiales (`src/data/seed.ts`) sont extraites des documents de
référence : **Plan d'activité** (≈46 activités, responsables, échéances, livrables),
**Chronogramme prévisionnel** (7 jalons décisifs + facteurs de décalage),
**Passation** (8 chantiers, rôles). Le registre des décisions démarre avec les
décisions connues du plan d'activité ; le document `PASS_Point_Etape` permettra de
compléter les décisions en attente.

Persistance locale (navigateur) pour cette première version. Le modèle est prêt à
être porté sur une base **Supabase dédiée** (projet et authentification séparés du
prototype opérationnel), sans changement de modèle.

## Démarrage

```bash
cd workspace
bun install     # ou npm install
bun run dev     # http://localhost:5174
```

Date de référence ajustable dans la barre latérale (par défaut 5 août 2026) pour
projeter l'état du programme à une date donnée.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · React Router · lucide-react.
Charte ANSUT : bleu `#2256A3`, orange `#F08224`.
