// Ponts vers les RPC du module logistique (toutes les écritures sont en base,
// réservées au superviseur). Chaque appel renvoie la ligne créée/mise à jour.
import { supabase } from "./supabase";
import type {
  Arrivage, Colis, Commande, Emplacement, Entrepot, Equipe, Fournisseur, Mission,
  RapportMission, StatutArrivage, StatutColis, StatutCommande, StatutMission, TypeMouvement,
} from "./types";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as T;
}

export const creerEntrepot = (libelle: string, zone: string, adresse: string | null) =>
  rpc<Entrepot>("pass_creer_entrepot", { p_libelle: libelle, p_zone: zone, p_adresse: adresse });

export const creerEmplacement = (idEntrepot: string, code: string, description: string | null) =>
  rpc<Emplacement>("pass_creer_emplacement", { p_id_entrepot: idEntrepot, p_code: code, p_description: description });

export const creerFournisseur = (raison: string, pays: string, email: string | null, tel: string | null) =>
  rpc<Fournisseur>("pass_creer_fournisseur", { p_raison: raison, p_pays: pays, p_email: email, p_tel: tel });

export interface LigneCommande { modele: string; quantite: number; prix_unitaire?: number }
export const creerCommande = (reference: string, idFournisseur: string, dateSouhaitee: string | null, devise: string, note: string | null, lignes: LigneCommande[]) =>
  rpc<Commande>("pass_creer_commande", { p_reference: reference, p_id_fournisseur: idFournisseur, p_date_souhaitee: dateSouhaitee, p_devise: devise, p_note: note, p_lignes: lignes });

export const majStatutCommande = (idCommande: string, statut: StatutCommande) =>
  rpc<Commande>("pass_maj_statut_commande", { p_id_commande: idCommande, p_statut: statut });

export interface LigneColisage { modele: string; quantite: number; imei_debut?: string; imei_fin?: string }
export const creerArrivage = (reference: string, idFournisseur: string, datePrevue: string | null, lignes: LigneColisage[], idCommande?: string | null) =>
  rpc<Arrivage>("pass_creer_arrivage", { p_reference: reference, p_id_fournisseur: idFournisseur, p_date_prevue: datePrevue, p_lignes: lignes, p_id_commande: idCommande ?? null });

export const receptionnerColis = (codeBarre: string, quantiteRecue: number) =>
  rpc<Colis>("pass_receptionner_colis", { p_code_barre: codeBarre, p_quantite_recue: quantiteRecue });

export const rangerColis = (idColis: string, idEmplacement: string) =>
  rpc<Colis>("pass_ranger_colis", { p_id_colis: idColis, p_id_emplacement: idEmplacement });

export const ouvrirPointMobile = (libelle: string, zone: string, lat: number | null, lon: number | null, idCampagne: string | null, reference: string | null) =>
  rpc<{ id_point: string; libelle: string }>("pass_ouvrir_point_mobile", {
    p_libelle: libelle, p_zone: zone, p_lat: lat, p_lon: lon, p_id_campagne: idCampagne, p_reference: reference,
  });

export const configEquipe = (idPoint: string, libelle: string, vehicule: string | null, zone: string | null, membres: string[]) =>
  rpc<Equipe>("pass_config_equipe", { p_id_point: idPoint, p_libelle: libelle, p_vehicule: vehicule, p_zone: zone, p_membres: membres });

export const majGeoloc = (idPoint: string, lat: number, lon: number) =>
  rpc<{ id_point: string }>("pass_maj_geoloc", { p_id_point: idPoint, p_lat: lat, p_lon: lon });

export const transfererVersPoint = (idPointDest: string, modele: string | null, quantite: number, reference: string | null) =>
  rpc<{ reference: string; quantite: number }>("pass_transferer_vers_point", {
    p_id_point_dest: idPointDest, p_modele: modele, p_quantite: quantite, p_reference: reference,
  });

export const demarrerMission = (idMission: string) =>
  rpc<Mission>("pass_demarrer_mission", { p_id_mission: idMission });

export const cloturerMission = (idMission: string, distribues: number, retours: number, incidents: string | null, observations: string | null, lat: number | null, lon: number | null) =>
  rpc<RapportMission>("pass_cloturer_mission", {
    p_id_mission: idMission, p_distribues: distribues, p_retours: retours,
    p_incidents: incidents, p_observations: observations, p_lat: lat, p_lon: lon,
  });

export const LIBELLE_STATUT_COMMANDE: Record<StatutCommande, string> = {
  brouillon: "Brouillon", envoyee: "Envoyée", confirmee: "Confirmée",
  partiellement_livree: "Partiellement livrée", livree: "Livrée", annulee: "Annulée",
};
export const LIBELLE_STATUT_ARRIVAGE: Record<StatutArrivage, string> = {
  attendu: "Attendu", en_reception: "En réception", receptionne: "Réceptionné", cloture: "Clôturé",
};
export const LIBELLE_STATUT_COLIS: Record<StatutColis, string> = {
  attendu: "Attendu", recu: "Reçu (conforme)", ecart: "Écart constaté", range: "Rangé",
};
export const LIBELLE_STATUT_MISSION: Record<StatutMission, string> = {
  preparee: "Préparée", en_cours: "En cours", cloturee: "Clôturée",
};
export const LIBELLE_MOUVEMENT: Record<TypeMouvement, string> = {
  reception: "Réception", rangement: "Rangement", transfert: "Transfert",
  remise: "Remise", retour: "Retour", ajustement: "Ajustement",
};
