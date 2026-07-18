import { Check, X, Lock } from "lucide-react";

const ETAPES = ["Enrôlement", "Vérification", "Décision", "Remise", "Reçu"];

interface Props {
  /** Index de l'étape courante (0 = Enrôlement … 4 = Reçu). */
  active: number;
  /** Le dossier a été refusé : la remise et le reçu deviennent inaccessibles. */
  refused?: boolean;
}

/** Fil d'Ariane du parcours PASS, affiché en tête des écrans du dossier. */
export function ParcoursStepper({ active, refused = false }: Props) {
  function statut(i: number): "done" | "current" | "refused" | "blocked" | "upcoming" {
    if (refused) {
      if (i < 2) return "done";
      if (i === 2) return "refused";
      return "blocked";
    }
    if (i < active) return "done";
    if (i === active) return "current";
    return "upcoming";
  }

  return (
    <nav aria-label="Étapes du parcours" className="no-print">
      <ol className="flex items-center gap-1 overflow-x-auto py-1">
        {ETAPES.map((label, i) => {
          const s = statut(i);
          const cercle =
            s === "done"
              ? "bg-emerald-600 text-white border-emerald-600"
              : s === "current"
                ? "bg-pass-blue text-white border-pass-blue ring-4 ring-pass-blue/15"
                : s === "refused"
                  ? "bg-red-600 text-white border-red-600"
                  : s === "blocked"
                    ? "bg-slate-100 text-slate-300 border-slate-200"
                    : "bg-white text-slate-400 border-slate-300";
          const texte =
            s === "current"
              ? "text-pass-blue font-semibold"
              : s === "done"
                ? "text-emerald-700"
                : s === "refused"
                  ? "text-red-700 font-semibold"
                  : "text-slate-400";
          return (
            <li key={label} className="flex items-center gap-1 shrink-0">
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-bold ${cercle}`}
                >
                  {s === "done" ? (
                    <Check size={14} />
                  ) : s === "refused" ? (
                    <X size={14} />
                  ) : s === "blocked" ? (
                    <Lock size={12} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={`text-xs sm:text-sm ${texte}`}>{label}</span>
              </div>
              {i < ETAPES.length - 1 && (
                <span
                  className={`mx-1 h-px w-6 sm:w-10 ${
                    i < active && !refused ? "bg-emerald-400" : "bg-slate-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
