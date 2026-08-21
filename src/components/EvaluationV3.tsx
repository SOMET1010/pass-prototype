import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Scale, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Gauge } from "lucide-react";
import { chargerEvaluation, evaluerDemande, LIBELLE_CONTROLE, LIBELLE_STATUT_REGULARITE } from "../lib/eligibilite";
import { SimuleBadge } from "./Badges";
import { formatDateHeure } from "../lib/rules";
import type { ControleRegularite, EvaluationIndividuelle, RangPriorite, ScoreDimension } from "../lib/types";

const RANG_STYLE: Record<RangPriorite, { cls: string; txt: string }> = {
  P1: { cls: "bg-emerald-600 text-white", txt: "P1 — priorité très élevée" },
  P2: { cls: "bg-pass-blue text-white", txt: "P2 — priorité élevée" },
  P3: { cls: "bg-amber-500 text-white", txt: "P3 — priorité normale" },
  P4: { cls: "bg-slate-400 text-white", txt: "P4 — priorité faible" },
};

function ResIcon({ r }: { r: string }) {
  if (r === "concluant") return <CheckCircle2 size={17} className="text-emerald-600" />;
  if (r === "non_concluant") return <XCircle size={17} className="text-red-600" />;
  return <AlertTriangle size={16} className="text-amber-500" />;
}

export function EvaluationV3({ idDemande, canEvaluer = true }: { idDemande: string; canEvaluer?: boolean }) {
  const [ev, setEv] = useState<EvaluationIndividuelle | null>(null);
  const [ctrls, setCtrls] = useState<ControleRegularite[]>([]);
  const [dims, setDims] = useState<ScoreDimension[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function charger() {
    const r = await chargerEvaluation(idDemande);
    setEv(r.evaluation); setCtrls(r.controles); setDims(r.dimensions); setLoading(false);
  }
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, [idDemande]);

  async function evaluer() {
    setBusy(true); setErr(null);
    try { await evaluerDemande(idDemande); await charger(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Erreur d'évaluation."); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="card p-5 text-slate-400 text-sm">Chargement de l'évaluation…</div>;

  const statut = ev?.statut_regularite;
  const total = dims.reduce((n, d) => n + Number(d.contribution), 0);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Scale size={18} className="text-pass-blue" /> Éligibilité — ciblage individuel (CDC v3)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Deux mécanismes séparés : les <strong>contrôles de régularité</strong> (bloquants, 0 point) déterminent la
            recevabilité ; le <strong>score C1–C5</strong> (jamais bloquant) produit un <strong>rang de priorité</strong>.
            Un refus ne vient que d'un contrôle en échec — jamais d'un score insuffisant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ev && <SimuleBadge />}
          {canEvaluer && (
            <button onClick={evaluer} disabled={busy} className="btn-primary text-sm">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {ev ? "Réévaluer" : "Évaluer"}
            </button>
          )}
        </div>
      </div>

      {err && <div className="text-xs text-red-600">{err}</div>}

      {!ev ? (
        <p className="text-sm text-slate-500">Aucune évaluation. Lancez l'évaluation pour appliquer le moteur v3.</p>
      ) : (
        <>
          {/* Verdict */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-bold ${
              statut === "recevable" ? "bg-emerald-600 text-white" : statut === "refus" ? "bg-red-600 text-white" : "bg-amber-500 text-white"
            }`}>
              <ShieldCheck size={15} /> {LIBELLE_STATUT_REGULARITE[statut!]}
            </span>
            {ev.rang_priorite && (
              <span className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-bold ${RANG_STYLE[ev.rang_priorite].cls}`}>
                <Gauge size={15} /> {RANG_STYLE[ev.rang_priorite].txt}
              </span>
            )}
            {ev.score != null && (
              <span className="text-sm text-slate-600">Score : <strong className="font-mono">{Number(ev.score).toFixed(1)}</strong>/100</span>
            )}
            <span className="ml-auto text-[11px] text-slate-400">Évalué le {formatDateHeure(ev.horodatage)}</span>
          </div>

          {statut !== "refus" && (
            <p className="text-[11px] text-slate-500 -mt-1">
              {statut === "recevable"
                ? "Recevable : servi selon le rang de priorité et le quota. Une demande non servie reste recevable — ce n'est pas un rejet."
                : "À instruire : une source est indisponible ou une concordance est partielle — un agent habilité tranche."}
            </p>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Régularité */}
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">
                Contrôles de régularité <span className="normal-case font-normal">(bloquants · 0 point)</span>
              </div>
              <div className="space-y-1.5">
                {ctrls.map((c) => (
                  <div key={c.id_controle} className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2">
                    <ResIcon r={c.resultat} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{LIBELLE_CONTROLE[c.controle] ?? c.controle}</div>
                      <div className="text-[11px] text-slate-400 truncate">{c.source} · {c.detail}</div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase ${
                      c.resultat === "concluant" ? "text-emerald-600" : c.resultat === "non_concluant" ? "text-red-600" : "text-amber-600"
                    }`}>{c.resultat === "non_concluant" ? "échec" : c.resultat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score C1-C5 */}
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">
                Score individuel <span className="normal-case font-normal">(C1–C5 · jamais bloquant)</span>
              </div>
              {dims.length === 0 ? (
                <p className="text-sm text-slate-400">Score non calculé (demande non recevable).</p>
              ) : (
                <div className="space-y-2">
                  {dims.map((d) => (
                    <div key={d.id_dimension}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700"><span className="font-mono text-pass-blue">{d.dimension}</span> — {d.libelle}</span>
                        <span className="text-slate-400">poids {d.poids} · {Number(d.contribution).toFixed(1)} pts</span>
                      </div>
                      <div className="mt-0.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-pass-blue" style={{ width: `${Math.round(Number(d.valeur) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-sm">
                    <span className="font-semibold">Score total</span>
                    <span className="font-mono font-bold">{total.toFixed(1)} / 100</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reproductibilité : jeu de paramètres archivé */}
          {ev.parametres && Object.keys(ev.parametres).length > 0 && (
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer font-semibold text-slate-600">Jeu de paramètres utilisé (reproductibilité)</summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(ev.parametres).map(([k, v]) => (
                  <span key={k} className="font-mono text-[10px] bg-slate-100 rounded px-1.5 py-0.5">{k}={v}</span>
                ))}
              </div>
              <p className="mt-1.5">Ce jeu est archivé avec l'évaluation : rejouer la demande avec ces mêmes paramètres redonne exactement ce classement.</p>
            </details>
          )}
        </>
      )}
    </div>
  );
}
