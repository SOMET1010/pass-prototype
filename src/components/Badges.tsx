import { AlertTriangle, CheckCircle2, HelpCircle, XCircle, FlaskConical } from "lucide-react";
import type { EtatDemande, Recommandation, ResultatVerif } from "../lib/types";
import { LIBELLE_ETAT, LIBELLE_RECO } from "../lib/rules";

/** Badge « SIMULÉ » — obligatoire sur toute vérification non réelle. */
export function SimuleBadge() {
  return (
    <span
      title="Vérification simulée — aucune connexion réelle au référentiel national"
      className="inline-flex items-center gap-1 rounded-full bg-pass-orange-light px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-pass-orange border border-pass-orange/40"
    >
      <FlaskConical size={12} /> Simulé
    </span>
  );
}

export function ReelBadge() {
  return (
    <span
      title="Vérification réelle contre le référentiel interne PASS"
      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700 border border-emerald-300"
    >
      Réel
    </span>
  );
}

export function EtatBadge({ etat }: { etat: EtatDemande }) {
  const styles: Record<EtatDemande, string> = {
    brouillon: "bg-slate-100 text-slate-600 border-slate-300",
    soumise: "bg-blue-50 text-blue-700 border-blue-300",
    a_instruire: "bg-amber-50 text-amber-700 border-amber-300",
    validee: "bg-emerald-50 text-emerald-700 border-emerald-300",
    refusee: "bg-red-50 text-red-700 border-red-300",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[etat]}`}>
      {LIBELLE_ETAT[etat]}
    </span>
  );
}

export function RecoBadge({ reco }: { reco: Recommandation | null }) {
  if (!reco) return <span className="text-sm text-slate-400">En attente de vérification</span>;
  const cfg: Record<Recommandation, { cls: string; icon: JSX.Element }> = {
    eligible: { cls: "bg-emerald-600 text-white", icon: <CheckCircle2 size={16} /> },
    non_eligible: { cls: "bg-red-600 text-white", icon: <XCircle size={16} /> },
    a_instruire: { cls: "bg-pass-orange text-white", icon: <HelpCircle size={16} /> },
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-bold ${cfg[reco].cls}`}>
      {cfg[reco].icon} {LIBELLE_RECO[reco]}
    </span>
  );
}

export function ResultatIcon({ resultat }: { resultat: ResultatVerif }) {
  if (resultat === "concluant") return <CheckCircle2 className="text-emerald-600" size={22} />;
  if (resultat === "non_concluant") return <XCircle className="text-red-600" size={22} />;
  return <AlertTriangle className="text-amber-500" size={22} />;
}
