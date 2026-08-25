// Défendabilité de la décision (Architecture ANSUT §3) : snapshot auto-suffisant
// et annulation append-only (compensation tracée).
import { supabase } from "./supabase";
import type { Annulation, Decision, DecisionSnapshot } from "./types";

export interface Defendabilite {
  decision: Decision | null;
  snapshot: DecisionSnapshot | null;
  annulation: Annulation | null;
}

export async function chargerDefendabilite(idDemande: string): Promise<Defendabilite> {
  const { data: dec } = await supabase
    .from("decision").select("*").eq("id_demande", idDemande)
    .order("horodatage", { ascending: false }).limit(1).maybeSingle();
  const decision = (dec as Decision) ?? null;
  if (!decision) return { decision: null, snapshot: null, annulation: null };
  const [{ data: snap }, { data: ann }] = await Promise.all([
    supabase.from("decision_snapshot").select("*").eq("id_decision", decision.id_decision).maybeSingle(),
    supabase.from("annulation").select("*").eq("cible_type", "decision").eq("id_cible", decision.id_decision).maybeSingle(),
  ]);
  return { decision, snapshot: (snap as DecisionSnapshot) ?? null, annulation: (ann as Annulation) ?? null };
}

export async function annulerDecision(idDecision: string, motif: string, autorisation: string): Promise<void> {
  const { error } = await supabase.rpc("pass_annuler_decision", {
    p_id_decision: idDecision, p_motif: motif, p_autorisation: autorisation,
  });
  if (error) throw error;
}
