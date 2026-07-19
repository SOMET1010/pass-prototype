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
  nni: string | null;
  numero_cmu: string | null;
  piece_photo_url: string | null;
  cmu_photo_url: string | null;
  nom: string;
  prenoms: string;
  date_naissance: string;
  zone_residence: string;
  photo_url: string | null;
  statut_verif_identite: StatutVerifIdentite;
  telephone_contact: string | null;
  contact_relation: string | null;
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
  consentement_signature: string | null;
  consentement_temoin: string | null;
  duree_enrolement_sec: number | null;
  date_soumission: string | null;
  created_at: string;
}

export interface Cloture {
  id_cloture: string;
  id_demande: string;
  conforme: boolean;
  observations: string | null;
  id_agent: string;
  horodatage: string;
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
  adresse: string | null;
  telephone: string | null;
  gestionnaire: string | null;
}

export interface StockPoint {
  id_point: string;
  libelle: string;
  zone: string;
  actif: boolean;
  adresse: string | null;
  telephone: string | null;
  gestionnaire: string | null;
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

export type StatutNotification = "en_attente" | "envoye" | "echec";
export type ModeIntegration = "simule" | "reel";

export interface Notification {
  id_notification: string;
  id_demande: string;
  canal: string;
  destinataire: string | null;
  message: string;
  est_simule: boolean;
  statut: StatutNotification;
  gateway: string | null;
  mode: ModeIntegration;
  ref_gateway: string | null;
  detail: string | null;
  horodatage: string;
}

export type CibleCachet = "decision" | "preuve_remise";

export interface CachetElectronique {
  id_cachet: string;
  cible_type: CibleCachet;
  cible_id: string;
  algorithme: string;
  empreinte: string;
  signature: string;
  autorite: string;
  reference: string | null;
  horodatage_scelle: string;
  mode: ModeIntegration;
  est_simule: boolean;
  created_at: string;
}

export interface JournalAudit {
  id_evenement: string;
  acteur: string;
  action: string;
  cible_type: string | null;
  cible_id: string | null;
  horodatage: string;
}
