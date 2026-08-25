import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Gauge, ShieldCheck, RotateCcw } from "lucide-react";
import { simulerEligibilite, type ResultatSimulation } from "../lib/eligibilite";
import { LIBELLE_CONTROLE, LIBELLE_STATUT_REGULARITE } from "../lib/eligibilite";
import { SimuleBadge } from "../components/Badges";
import type { RangPriorite } from "../lib/types";

const RANG_STYLE: Record<RangPriorite, { cls: string; txt: string }> = {
  P1: { cls: "bg-emerald-600 text-white", txt: "P1 — priorité très élevée" },
  P2: { cls: "bg-pass-blue text-white", txt: "P2 — priorité élevée" },
  P3: { cls: "bg-amber-500 text-white", txt: "P3 — priorité normale" },
  P4: { cls: "bg-slate-400 text-white", txt: "P4 — priorité faible" },
};
const CONTROLES = ["identite", "majorite", "ayant_droit", "non_cumul", "ligne_mobile", "campagne"] as const;
const RESULTATS = ["concluant", "indisponible", "non_concluant"] as const;
const sel = "rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pass-blue/30";

const DEFAUT = {
  controles: Object.fromEntries(CONTROLES.map((c) => [c, "concluant"])) as Record<string, string>,
  techno: "3G", activite_jours: 30, possede_perso: true, c2: 0.6, c3: 0.5, c4: 0.5, c5: 0.3,
};

export function Simulateur() {
  const [f, setF] = useState(DEFAUT);
  const [res, setRes] = useState<ResultatSimulation | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const simuler = useCallback(async () => {
    try { setRes(await simulerEligibilite(f)); setErr(null); }
    catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); }
  }, [f]);
  useEffect(() => { const t = setTimeout(simuler, 150); return () => clearTimeout(t); }, [simuler]);

  const setC = (c: string, v: string) => setF((s) => ({ ...s, controles: { ...s.controles, [c]: v } }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><FlaskConical className="text-pass-blue" size={22} /> Simulateur d'éligibilité <SimuleBadge /></h1>
        <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
          Testez une situation <strong>sans créer de dossier</strong>. Le simulateur applique le moteur v3 (régularité +
          score C1–C5 → rang P1–P4) avec les <strong>paramètres en vigueur</strong> : idéal pour la formation et pour
          mesurer l'effet d'un changement de poids ou de seuil.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Entrées */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <div className="font-semibold text-sm">Contrôles de régularité (bloquants)</div>
            <div className="grid grid-cols-2 gap-2">
              {CONTROLES.map((c) => (
                <label key={c} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-600">{LIBELLE_CONTROLE[c]}</span>
                  <select className={sel} value={f.controles[c]} onChange={(e) => setC(c, e.target.value)}>
                    {RESULTATS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <div className="font-semibold text-sm">Signaux du score</div>
            <div className="grid grid-cols-3 gap-2 items-end">
              <label className="text-xs text-slate-500">Techno ligne
                <select className={`${sel} w-full mt-1`} value={f.techno} onChange={(e) => setF((s) => ({ ...s, techno: e.target.value }))}>
                  <option>2G</option><option>3G</option><option>4G</option></select></label>
              <label className="text-xs text-slate-500">Dernière activité (j)
                <input type="number" className={`${sel} w-full mt-1`} value={f.activite_jours} onChange={(e) => setF((s) => ({ ...s, activite_jours: Number(e.target.value) }))} /></label>
              <label className="flex items-center gap-2 text-xs text-slate-600 pb-2">
                <input type="checkbox" checked={f.possede_perso} onChange={(e) => setF((s) => ({ ...s, possede_perso: e.target.checked }))} /> Smartphone perso
              </label>
            </div>
            {([["c2", "C2 — vulnérabilité socio-éco"], ["c3", "C3 — dépendance (accès autonome)"], ["c4", "C4 — accessibilité au marché"], ["c5", "C5 — vulnérabilités spécifiques"]] as const).map(([k, lbl]) => (
              <div key={k}>
                <div className="flex justify-between text-xs text-slate-600"><span>{lbl}</span><span className="font-mono">{(f as never)[k]}</span></div>
                <input type="range" min={0} max={1} step={0.05} value={(f as never)[k]} onChange={(e) => setF((s) => ({ ...s, [k]: Number(e.target.value) }))} className="w-full accent-pass-blue" />
              </div>
            ))}
            <button className="btn-ghost text-sm" onClick={() => setF(DEFAUT)}><RotateCcw size={14} /> Réinitialiser</button>
          </div>
        </div>

        {/* Résultat */}
        <div className="card p-5 space-y-4 self-start">
          <div className="font-semibold text-sm">Résultat de la simulation</div>
          {err && <div className="text-xs text-red-600">{err}</div>}
          {!res ? <div className="text-slate-400 text-sm">…</div> : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-bold ${
                  res.statut_regularite === "recevable" ? "bg-emerald-600 text-white" : res.statut_regularite === "refus" ? "bg-red-600 text-white" : "bg-amber-500 text-white"}`}>
                  <ShieldCheck size={15} /> {LIBELLE_STATUT_REGULARITE[res.statut_regularite]}
                </span>
                {res.rang && <span className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-bold ${RANG_STYLE[res.rang].cls}`}><Gauge size={15} /> {RANG_STYLE[res.rang].txt}</span>}
                {res.score != null && <span className="text-sm text-slate-600">Score : <strong className="font-mono">{Number(res.score).toFixed(1)}</strong>/100</span>}
              </div>
              {res.statut_regularite === "refus" && <p className="text-[11px] text-red-600">Un contrôle de régularité est en échec → refus motivé (le score n'entre pas en jeu).</p>}
              {res.statut_regularite === "a_instruire" && <p className="text-[11px] text-amber-600">Une source est indisponible → examen par un agent (pas de rejet automatique).</p>}

              {res.dimensions?.length > 0 && (
                <div className="space-y-2">
                  {res.dimensions.map((d) => (
                    <div key={d.dimension}>
                      <div className="flex justify-between text-xs"><span className="text-slate-700"><span className="font-mono text-pass-blue">{d.dimension}</span> — {d.libelle}</span><span className="text-slate-400">poids {d.poids} · {Number(d.contribution).toFixed(1)} pts</span></div>
                      <div className="mt-0.5 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-pass-blue" style={{ width: `${Math.round(Number(d.valeur) * 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
              <details className="text-xs text-slate-500">
                <summary className="cursor-pointer font-semibold text-slate-600">Paramètres appliqués</summary>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(res.parametres ?? {}).map(([k, v]) => <span key={k} className="font-mono text-[10px] bg-slate-100 rounded px-1.5 py-0.5">{k}={v}</span>)}
                </div>
              </details>
              <p className="text-[11px] text-slate-400">Simulation — aucune donnée enregistrée, aucun dossier créé.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
