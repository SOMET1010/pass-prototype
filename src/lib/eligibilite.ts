// Ponts vers le moteur d'éligibilité v3 (CDC v3) et le registre de paramètres.
import { supabase } from "./supabase";
import type {
  ControleRegularite, EvaluationIndividuelle, Parametre, ScoreDimension, StatutRegularite,
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
