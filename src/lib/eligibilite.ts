// Ponts vers le moteur d'éligibilité v3 (CDC v3) et le registre de paramètres.
import { supabase } from "./supabase";
import type {
  CiblageGeo, CiblageLocalite, ControleRegularite, EvaluationIndividuelle, Localite,
  ModeSource, Parametre, ProfilUsage, ScoreDimension, SourceExterne, StatutRegularite,
} from "./types";

/** Évalue une demande : régularité (bloquante) + score C1–C5 → rang P1–P4. */
export async function evaluerDemande(idDemande: string): Promise<EvaluationIndividuelle> {
  const { data, error } = await supabase.rpc("pass_evaluer_demande", { p_id_demande: idDemande });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as EvaluationIndividuelle;
}

export interface EvaluationComplete {
  evaluation: EvaluationIndividuelle | null;
  controles: ControleRegularite[];
  dimensions: ScoreDimension[];
}

/** Charge l'évaluation existante d'une demande (avec contrôles + dimensions). */
export async function chargerEvaluation(idDemande: string): Promise<EvaluationComplete> {
  const { data: ev } = await supabase
    .from("evaluation_individuelle").select("*").eq("id_demande", idDemande).maybeSingle();
  const evaluation = (ev as EvaluationIndividuelle) ?? null;
  if (!evaluation) return { evaluation: null, controles: [], dimensions: [] };
  const [{ data: c }, { data: d }] = await Promise.all([
    supabase.from("controle_regularite").select("*").eq("id_evaluation", evaluation.id_evaluation).order("ordre"),
    supabase.from("score_dimension").select("*").eq("id_evaluation", evaluation.id_evaluation).order("dimension"),
  ]);
  return { evaluation, controles: (c as ControleRegularite[]) ?? [], dimensions: (d as ScoreDimension[]) ?? [] };
}

// ---------- Paramètres administrables ----------
export async function chargerParametres(): Promise<Parametre[]> {
  const { data } = await supabase.from("v_parametres").select("*");
  return (data as Parametre[]) ?? [];
}
export async function majParametre(cle: string, valeur: string, motif: string): Promise<void> {
  const { error } = await supabase.rpc("pass_param_maj", { p_cle: cle, p_valeur: valeur, p_motif: motif });
  if (error) throw error;
}

// ---------- Ciblage géographique (§2) ----------
export const chargerLocalites = async (): Promise<Localite[]> =>
  ((await supabase.from("localite").select("*").order("region")).data as Localite[]) ?? [];

export const chargerCiblages = async (): Promise<CiblageGeo[]> =>
  ((await supabase.from("ciblage_geo").select("*").order("horodatage", { ascending: false })).data as CiblageGeo[]) ?? [];

export const chargerCiblageLocalites = async (idCiblage: string): Promise<CiblageLocalite[]> =>
  ((await supabase.from("ciblage_localite").select("*").eq("id_ciblage", idCiblage)).data as CiblageLocalite[]) ?? [];

export async function calculerCiblageGeo(idCampagne: string | null, volume: number): Promise<CiblageGeo> {
  const { data, error } = await supabase.rpc("pass_calculer_ciblage_geo", { p_id_campagne: idCampagne, p_volume_total: volume });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as CiblageGeo;
}
export async function arbitrerReserve(idCiblage: string, idLocalite: string, quantite: number, motif: string): Promise<void> {
  const { error } = await supabase.rpc("pass_arbitrer_reserve", {
    p_id_ciblage: idCiblage, p_identifiant_localite: idLocalite, p_quantite: quantite, p_motif: motif,
  });
  if (error) throw error;
}

// ---------- Sources externes (§4) ----------
export const chargerSources = async (): Promise<SourceExterne[]> =>
  ((await supabase.from("source_externe").select("*").order("code")).data as SourceExterne[]) ?? [];
export async function majSource(code: string, mode: ModeSource, delai: number, actif: boolean): Promise<void> {
  const { error } = await supabase.rpc("pass_source_maj", { p_code: code, p_mode: mode, p_delai_max_sec: delai, p_actif: actif });
  if (error) throw error;
}

// ---------- Profil d'usage (§3.4, base séparée) ----------
export async function lireProfilUsage(idPersonne: string): Promise<ProfilUsage | null> {
  const { data } = await supabase.rpc("pass_profil_usage_lire", { p_id_personne: idPersonne });
  const r = (Array.isArray(data) ? data[0] : data) as ProfilUsage | null;
  return r ?? null;
}
export async function majProfilUsage(idPersonne: string, usage: string | null, autre: string | null): Promise<void> {
  const { error } = await supabase.rpc("pass_profil_usage_maj", { p_id_personne: idPersonne, p_usage: usage, p_autre: autre });
  if (error) throw error;
}
export const LIBELLE_MODE_SOURCE: Record<ModeSource, string> = {
  fichier: "Fichier (import périodique)", service: "Service (temps réel)", declaratif: "Déclaratif (dégradé → à instruire)",
};

// ---------- Libellés v3 ----------
export const LIBELLE_STATUT_REGULARITE: Record<StatutRegularite, string> = {
  recevable: "Recevable", refus: "Refus (régularité)", a_instruire: "À instruire",
};
export const LIBELLE_CONTROLE: Record<string, string> = {
  identite: "Identité", majorite: "Majorité", ayant_droit: "Ayant droit social",
  non_cumul: "Non-cumul", ligne_mobile: "Ligne mobile", campagne: "Campagne",
};
export const LIBELLE_GROUPE: Record<string, string> = {
  score_individuel: "Score individuel (C1–C5, seuils P1–P4)",
  regularite: "Contrôles de régularité",
  ciblage_geo: "Ciblage géographique",
  sources: "Interrogation des sources",
};
