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

// ===================== ÉLIGIBILITÉ v3 (CDC v3) =====================
export type StatutRegularite = "recevable" | "refus" | "a_instruire";
export type RangPriorite = "P1" | "P2" | "P3" | "P4";

export interface Parametre {
  cle: string;
  libelle: string;
  groupe: string;
  type: string;
  unite: string | null;
  arrete: boolean;
  description: string | null;
  valeur: string | null;
  maj_le: string | null;
  maj_par: string | null;
  motif: string | null;
}

export interface EvaluationIndividuelle {
  id_evaluation: string;
  id_demande: string;
  statut_regularite: StatutRegularite;
  score: number | null;
  rang_priorite: RangPriorite | null;
  parametres: Record<string, string>;
  est_simule: boolean;
  id_agent: string | null;
  horodatage: string;
}

export interface ControleRegularite {
  id_controle: string;
  id_evaluation: string;
  controle: string;
  resultat: ResultatVerif;
  bloquant: boolean;
  source: string | null;
  detail: string | null;
  ordre: number;
}

export interface ScoreDimension {
  id_dimension: string;
  id_evaluation: string;
  dimension: string;
  libelle: string;
  valeur: number;
  poids: number;
  contribution: number;
  detail: string | null;
}

// ===================== CIBLAGE GÉOGRAPHIQUE (CDC v3 §2) =====================
export interface Localite {
  identifiant_localite: string;
  nom: string; region: string; departement: string | null; sous_prefecture: string | null;
  latitude: number | null; longitude: number | null;
  population: number; taux_pauvrete: number; taux_possession: number; part_femmes_jeunes: number;
  rural: boolean; distance_site_km: number;
  couverture_2g: boolean; couverture_3g: boolean; couverture_4g: boolean;
  electrifiee: boolean; point_recharge: boolean; point_remise_id: string | null;
}
export interface CiblageGeo {
  id_ciblage: string; id_campagne: string | null;
  volume_total: number; volume_score: number; volume_reserve: number;
  parametres: Record<string, string>; id_agent: string | null; horodatage: string;
}
export interface CiblageLocalite {
  id_ligne: string; id_ciblage: string; identifiant_localite: string;
  retenue: boolean; motif_exclusion: string | null;
  score: number | null; population_eligible: number | null;
  quota_score: number; quota_reserve: number; quota_total: number;
}

// ===================== SOURCES EXTERNES (CDC v3 §4) =====================
export type ModeSource = "fichier" | "service" | "declaratif";
export interface SourceExterne {
  code: string; libelle: string; mode: ModeSource; delai_max_sec: number;
  actif: boolean; champs: { champ: string; regle: string }[]; description: string | null;
}

// ===================== PROFIL D'USAGE (CDC v3 §3.4, base séparée) =====================
export interface ProfilUsage {
  id_profil: string; id_personne: string;
  usage_principal: string | null; autre_texte: string | null;
  horodatage: string; maj_le: string;
}

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
  type_point?: "fixe" | "mobile";
  statut_point?: "actif" | "inactif" | "en_mission";
  latitude?: number | null;
  longitude?: number | null;
  id_campagne?: string | null;
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

// ===================== MODULE LOGISTIQUE =====================
export type TypePoint = "fixe" | "mobile";
export type StatutPoint = "actif" | "inactif" | "en_mission";
export type StatutArrivage = "attendu" | "en_reception" | "receptionne" | "cloture";
export type StatutColis = "attendu" | "recu" | "ecart" | "range";
export type StatutMission = "preparee" | "en_cours" | "cloturee";
export type TypeMouvement = "reception" | "rangement" | "transfert" | "remise" | "retour" | "ajustement";

export type StatutCommande = "brouillon" | "envoyee" | "confirmee" | "partiellement_livree" | "livree" | "annulee";

export interface Commande {
  id_commande: string;
  reference: string;
  id_fournisseur: string;
  date_commande: string;
  date_souhaitee: string | null;
  statut: StatutCommande;
  montant_total: number;
  devise: string;
  note: string | null;
  id_agent: string | null;
  created_at: string;
}

export interface CommandeLigne {
  id_ligne: string;
  id_commande: string;
  modele: string;
  quantite: number;
  prix_unitaire: number;
}

export interface Fournisseur {
  id_fournisseur: string;
  raison_sociale: string;
  pays: string;
  contact_email: string | null;
  contact_tel: string | null;
  actif: boolean;
  created_at: string;
}

export interface Entrepot {
  id_entrepot: string;
  libelle: string;
  zone: string;
  adresse: string | null;
}

export interface Emplacement {
  id_emplacement: string;
  id_entrepot: string;
  code: string;
  description: string | null;
}

export interface Arrivage {
  id_arrivage: string;
  reference: string;
  id_fournisseur: string;
  id_commande: string | null;
  date_prevue: string | null;
  date_reception: string | null;
  statut: StatutArrivage;
  note: string | null;
  created_at: string;
}

export interface Colis {
  id_colis: string;
  id_arrivage: string;
  id_ligne: string | null;
  code_barre: string;
  modele: string;
  quantite_attendue: number;
  quantite_recue: number | null;
  imei_debut: string | null;
  imei_fin: string | null;
  statut: StatutColis;
  id_emplacement: string | null;
  ecart: number;
  horodatage_recu: string | null;
}

export interface Equipe {
  id_equipe: string;
  libelle: string;
  id_point_retrait: string | null;
  vehicule: string | null;
  zone: string | null;
  created_at: string;
}

export interface Mission {
  id_mission: string;
  reference: string;
  id_point_retrait: string;
  id_campagne: string | null;
  date_debut: string | null;
  date_fin: string | null;
  statut: StatutMission;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface RapportMission {
  id_rapport: string;
  id_mission: string;
  distribues: number;
  retours: number;
  stock_restant: number;
  incidents: string | null;
  observations: string | null;
  id_agent: string;
  latitude: number | null;
  longitude: number | null;
  horodatage: string;
}

export interface MouvementStock {
  id_mouvement: string;
  type_mvt: TypeMouvement;
  id_terminal: string | null;
  id_colis: string | null;
  quantite: number;
  origine: string | null;
  destination: string | null;
  reference: string | null;
  id_agent: string | null;
  horodatage: string;
}

export interface StockLogistique {
  lieu: string;
  niveau: "point" | "entrepot";
  modele: string;
  en_stock: number;
  remis: number;
}

export interface JournalAudit {
  id_evenement: string;
  acteur: string;
  action: string;
  cible_type: string | null;
  cible_id: string | null;
  horodatage: string;
}
