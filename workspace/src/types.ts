// Modèle de données du workspace de pilotage PASS.
// Outil interne de gestion de programme — AUCUNE donnée de bénéficiaire.

export type Fonction =
  | "Direction Générale"
  | "Marchés"
  | "Juridique"
  | "Données"
  | "Plateforme"
  | "Partenaires"
  | "Logistique"
  | "Budget"
  | "Communication"
  | "Coordination";

export type RoleId =
  | "chef_programme"
  | "referent"
  | "comite_pilotage"
  | "direction_generale"
  | "observateur";

export interface Role {
  id: RoleId;
  libelle: string;
  description: string;
}

export interface Membre {
  id: string;
  nom: string;
  fonction: Fonction;
  role: RoleId;
  email: string;
}

export type StatutTache = "a_faire" | "en_cours" | "bloque" | "fait";
export type Priorite = "haute" | "moyenne" | "basse";

// Un chantier = un lot de travail du programme, avec un référent.
export interface Chantier {
  id: string;
  code: string;
  libelle: string;
  perimetre: string;
  referent: Fonction;
  chargePrincipale: string; // ex. "Août à novembre"
  transverse?: boolean;
  ordre: number;
}

// Une action / tâche rattachée à un chantier.
export interface Tache {
  id: string;
  libelle: string;
  chantierId: string;
  responsable: Fonction;
  assigneA?: string; // id membre
  echeance: string; // ISO date
  statut: StatutTache;
  priorite: Priorite;
  avancement: number; // 0..100
  livrable: string;
  dependances: string[]; // ids d'autres taches (fin -> début)
  jalonId?: string; // jalon que cette tâche sert
  relances: Relance[];
  note?: string;
}

export interface Relance {
  date: string; // ISO
  auteur: string;
  message: string;
}

export type NatureJalon = "reglementaire" | "industriel" | "interne" | "decision";
export type StatutJalon = "a_venir" | "en_cours" | "atteint" | "en_retard";

export interface Jalon {
  id: string;
  libelle: string;
  datePrevue: string; // ISO
  dateReelle?: string;
  nature: NatureJalon;
  chantierId?: string;
  ceQuiEnDepend: string;
  dependances: string[]; // ids d'autres jalons
  decisif: boolean;
  statut: StatutJalon;
}

export type InstanceDecision =
  | "Direction Générale"
  | "Comité de pilotage"
  | "Comité opérationnel"
  | "Services compétents";

export type StatutDecision = "a_instruire" | "instruite" | "rendue" | "sans_objet";

export interface Decision {
  id: string;
  libelle: string;
  ceQuElleConditionne: string;
  instance: InstanceDecision;
  statut: StatutDecision;
  echeance?: string; // ISO
  dateRendue?: string;
  teneur?: string;
  bloquante: boolean;
  chantierId?: string;
  jalonsBloques: string[]; // ids jalons
}

export type Maitrise = "interne" | "partagee" | "hors_de_notre_main";
export type Gravite = "critique" | "elevee" | "moderee" | "faible";
export type StatutRisque = "ouvert" | "sous_controle" | "clos";

export interface Risque {
  id: string;
  libelle: string;
  parade: string; // ce qu'on y oppose
  maitrise: Maitrise;
  gravite: Gravite;
  probabilite: Gravite; // même échelle
  statut: StatutRisque;
  chantierId?: string;
  effet?: string;
}

export type StatutDoc = "projet" | "valide" | "obsolete";

export interface Document {
  id: string;
  titre: string;
  version: string;
  statut: StatutDoc;
  auteur: Fonction;
  date: string; // ISO
  confidentiel: boolean;
  lien?: string;
  fichier?: string;
  chantierId?: string;
  decisionId?: string;
  seanceId?: string;
}

export type NaturePartenaire = "operateur" | "institution" | "fournisseur";
export type StatutRelation = "a_engager" | "en_cours" | "engage" | "convention_signee";

export interface Partenaire {
  id: string;
  libelle: string;
  nature: NaturePartenaire;
  statutRelation: StatutRelation;
  convention?: string;
  prochaineEcheance?: string; // ISO
  contactEmail?: string;
  note?: string;
}

export interface Seance {
  id: string;
  instance: InstanceDecision | "Conseil d'administration";
  date: string; // ISO
  rythme: string;
  participants: string[];
  ordreDuJour: string[];
  releveDecisions: string[];
  actionsGenerees: string[]; // ids taches
  documents: string[]; // ids docs
}

export interface Programme {
  id: string;
  libelle: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
}

export interface WorkspaceData {
  programme: Programme;
  chantiers: Chantier[];
  taches: Tache[];
  jalons: Jalon[];
  decisions: Decision[];
  risques: Risque[];
  documents: Document[];
  partenaires: Partenaire[];
  seances: Seance[];
  membres: Membre[];
}
