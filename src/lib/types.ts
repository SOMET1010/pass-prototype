// Types du domaine PASS — miroir du schéma Supabase (prototype).

export type RoleAgent = "enrolement" | "instructeur" | "remise" | "superviseur";
export type StatutAgent = "actif" | "suspendu";
export type StatutVerifIdentite = "non_verifie" | "verifie" | "echec";
export type EtatCampagne = "preparee" | "ouverte" | "cloturee";
export type CanalDemande = "autonome" | "assiste";
export type EtatDemande = "brouillon" | "soumise" | "a_instruire" | "validee" | "refusee";
export type Recommandation = "eligible" | "non_eligible" | "a_instruire";
export type SourceVerif = "oneci" | "rsu" | "operateur" | "imei" | "historique";
export type ResultatVerif = "concluant" | "non_concluant" | "indisponible";
export type SensDecision = "validee" | "refusee";
export type StatutTerminal = "en_stock" | "remis" | "perdu" | "bloque";
export type MoyenConsentement = "signature" | "assiste_temoin" | "otp";

export interface Agent {
  id_agent: string;
  user_id: string | null;
  identite: string;
  role: RoleAgent;
  statut: StatutAgent;
}

export interface Personne {
  id_personne: string;
  numero_cni: string;
  nom: string;
  prenoms: string;
  date_naissance: string;
  zone_residence: string;
  photo_url: string | null;
  statut_verif_identite: StatutVerifIdentite;
  profil_demo: Record<string, unknown>;
  created_at: string;
}

export interface Campagne {
  id_campagne: string;
  libelle: string;
  date_debut: string;
  date_fin: string;
  zones_couvertes: string[];
  quota_total: number;
  etat: EtatCampagne;
}

export interface Demande {
  id_demande: string;
  numero_dossier: string;
  id_personne: string;
  id_campagne: string;
  canal: CanalDemande;
  id_agent: string | null;
  etat: EtatDemande;
  recommandation: Recommandation | null;
  consentement: boolean;
  consentement_moyen: MoyenConsentement | null;
  date_soumission: string | null;
  created_at: string;
}

export interface Verification {
  id_verification: string;
  id_demande: string;
  source: SourceVerif;
  resultat: ResultatVerif;
  est_simule: boolean;
  donnees_retour: Record<string, unknown> | null;
  horodatage: string;
}

export interface Decision {
  id_decision: string;
  id_demande: string;
  sens: SensDecision;
  motif: string | null;
  id_agent: string;
  horodatage: string;
}

export interface Terminal {
  id_terminal: string;
  modele: string;
  imei: string;
  id_personne: string | null;
  statut: StatutTerminal;
  id_point_retrait: string | null;
}

export interface PointRetrait {
  id_point: string;
  libelle: string;
  zone: string;
  actif: boolean;
}

export interface StockPoint {
  id_point: string;
  libelle: string;
  zone: string;
  actif: boolean;
  stock: number;
  remis: number;
}

export interface Distribution {
  id_distribution: string;
  id_demande: string;
  id_terminal: string;
  id_agent: string;
  point_remise: string;
  date_remise: string;
  statut_activation: "non_active" | "active";
}

export type TypeSav = "perte" | "vol" | "panne" | "autre";
export type StatutSav = "ouvert" | "en_cours" | "resolu";

export interface SavTicket {
  id_ticket: string;
  id_distribution: string;
  type_incident: TypeSav;
  statut: StatutSav;
  description: string | null;
  resolution: string | null;
  id_agent: string;
  created_at: string;
  resolved_at: string | null;
}

export interface Notification {
  id_notification: string;
  id_demande: string;
  canal: string;
  destinataire: string | null;
  message: string;
  est_simule: boolean;
  horodatage: string;
}

export interface JournalAudit {
  id_evenement: string;
  acteur: string;
  action: string;
  cible_type: string | null;
  cible_id: string | null;
  horodatage: string;
}
