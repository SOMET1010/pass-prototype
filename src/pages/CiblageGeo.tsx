import { useCallback, useEffect, useState } from "react";
import { Map, Play, Loader2, Filter, Scale, PiggyBank, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "../components/Toaster";
import { useAuth } from "../context/AuthContext";
import { SimuleBadge } from "../components/Badges";
import { formatDateHeure } from "../lib/rules";
import {
  arbitrerReserve, calculerCiblageGeo, chargerCiblageLocalites, chargerCiblages, chargerLocalites,
} from "../lib/eligibilite";
import type { CiblageGeo as TCiblage, CiblageLocalite, Campagne, Localite } from "../lib/types";

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pass-blue/30";

export function CiblageGeo() {
  const { agent } = useAuth();
  const superviseur = agent?.role === "superviseur";
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [localites, setLocalites] = useState<Localite[]>([]);
  const [ciblages, setCiblages] = useState<TCiblage[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [lignes, setLignes] = useState<CiblageLocalite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [idCamp, setIdCamp] = useState("");
  const [volume, setVolume] = useState(2000);
  // arbitrage
  const [arbLoc, setArbLoc] = useState(""); const [arbQte, setArbQte] = useState(50); const [arbMotif, setArbMotif] = useState("");

  const charger = useCallback(async () => {
    const [{ data: c }, loc, cib] = await Promise.all([
      supabase.from("campagne").select("*").order("date_debut", { ascending: false }),
      chargerLocalites(), chargerCiblages(),
    ]);
    setCampagnes((c as Campagne[]) ?? []);
    setLocalites(loc); setCiblages(cib);
    if (cib[0] && !sel) setSel(cib[0].id_ciblage);
    setLoading(false);
  }, [sel]);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { if (sel) chargerCiblageLocalites(sel).then(setLignes); }, [sel]);

  const run = ciblages.find((c) => c.id_ciblage === sel) ?? null;
  const nomLoc = (id: string) => localites.find((l) => l.identifiant_localite === id);
  const retenues = lignes.filter((l) => l.retenue).sort((a, b) => b.quota_total - a.quota_total);
  const exclues = lignes.filter((l) => !l.retenue);
  const reserveUtilisee = lignes.reduce((n, l) => n + l.quota_reserve, 0);

  async function lancer() {
    setBusy(true);
    try {
      const c = await calculerCiblageGeo(idCamp || null, volume);
      toast("Ciblage calculé.", "success");
      await charger(); setSel(c.id_ciblage);
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); } finally { setBusy(false); }
  }
  async function arbitrer() {
    if (!sel || !arbLoc || arbQte <= 0 || !arbMotif.trim()) return toast("Localité, quantité et motif obligatoires.", "error");
    try {
      await arbitrerReserve(sel, arbLoc, arbQte, arbMotif);
      toast("Attribution sur la réserve enregistrée.", "success");
      setArbMotif(""); await chargerCiblageLocalites(sel).then(setLignes);
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
  }

  if (loading) return <div className="text-slate-400">Chargement…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Map className="text-pass-blue" size={22} /> Ciblage géographique <SimuleBadge /></h1>
        <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
          Traitement par lot, par campagne (CDC v3 §2). Trois filtres éliminatoires, un score de priorisation à cinq
          critères (paramétrable), puis l'allocation des quotas — la <strong>population éligible</strong> est
          <em> population × taux de pauvreté</em>, pour ne pas privilégier les villes peuplées.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Lancer + réserve */}
        <div className="space-y-5">
          {superviseur && (
            <div className="card p-5 space-y-3">
              <div className="font-semibold flex items-center gap-2"><Play size={16} className="text-pass-blue" /> Lancer un ciblage</div>
              <div>
                <label className="text-xs text-slate-500">Campagne</label>
                <select className={inputCls} value={idCamp} onChange={(e) => setIdCamp(e.target.value)}>
                  <option value="">— (aucune) —</option>
                  {campagnes.map((c) => <option key={c.id_campagne} value={c.id_campagne}>{c.libelle}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Volume de la campagne (terminaux)</label>
                <input type="number" className={inputCls} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
              </div>
              <button className="btn-primary w-full" onClick={lancer} disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Calculer le ciblage
              </button>
            </div>
          )}

          {run && (
            <div className="card p-5 space-y-2">
              <div className="font-semibold flex items-center gap-2"><PiggyBank size={16} className="text-pass-orange" /> Enveloppes</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-lg font-bold text-pass-blue-dark">{run.volume_total}</div><div className="text-[10px] text-slate-400 uppercase">Total</div></div>
                <div><div className="text-lg font-bold text-pass-blue-dark">{run.volume_score}</div><div className="text-[10px] text-slate-400 uppercase">Score</div></div>
                <div><div className="text-lg font-bold text-pass-orange">{run.volume_reserve}</div><div className="text-[10px] text-slate-400 uppercase">Réserve</div></div>
              </div>
              <div className="text-[11px] text-slate-400">Réserve utilisée : {reserveUtilisee} / {run.volume_reserve}</div>
              {superviseur && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-xs font-semibold text-slate-600">Attribuer sur la réserve (motif obligatoire)</div>
                  <select className={inputCls} value={arbLoc} onChange={(e) => setArbLoc(e.target.value)}>
                    <option value="">Localité…</option>
                    {localites.map((l) => <option key={l.identifiant_localite} value={l.identifiant_localite}>{l.nom} ({l.region})</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input type="number" className={`${inputCls} w-24`} value={arbQte} onChange={(e) => setArbQte(Number(e.target.value))} />
                    <input className={inputCls} placeholder="Motif" value={arbMotif} onChange={(e) => setArbMotif(e.target.value)} />
                  </div>
                  <button className="btn-accent w-full text-sm" onClick={arbitrer}>Enregistrer l'arbitrage</button>
                </div>
              )}
            </div>
          )}

          <div className="card p-5">
            <div className="font-semibold mb-2 text-sm">Exécutions</div>
            {ciblages.length === 0 ? <p className="text-sm text-slate-400">Aucun ciblage.</p> : (
              <div className="space-y-1.5">
                {ciblages.map((c) => (
                  <button key={c.id_ciblage} onClick={() => setSel(c.id_ciblage)}
                    className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${sel === c.id_ciblage ? "border-pass-blue bg-pass-blue-light/40" : "border-slate-200"}`}>
                    <div className="flex justify-between"><span>Volume {c.volume_total}</span><span className="text-xs text-slate-400">{formatDateHeure(c.horodatage)}</span></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Résultats */}
        <div className="lg:col-span-2 space-y-4">
          {!run ? <div className="card p-5 text-slate-400 text-sm">Lancez ou sélectionnez un ciblage.</div> : (
            <>
              <div className="card p-5">
                <div className="font-semibold flex items-center gap-2 mb-3"><Scale size={16} className="text-pass-blue" /> Localités retenues ({retenues.length}) — quota par priorité</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-slate-400 border-b border-slate-200">
                      <th className="py-1.5 font-medium">Localité</th><th className="font-medium">Région</th>
                      <th className="font-medium text-right">Score</th><th className="font-medium text-right">Pop. élig.</th>
                      <th className="font-medium text-right">Quota score</th><th className="font-medium text-right">Réserve</th><th className="font-medium text-right">Total</th></tr></thead>
                    <tbody>
                      {retenues.map((l) => {
                        const lo = nomLoc(l.identifiant_localite);
                        return (
                          <tr key={l.id_ligne} className="border-b border-slate-100 last:border-0">
                            <td className="py-1.5">{lo?.nom}{lo?.rural && <span className="ml-1 text-[9px] text-slate-400 uppercase">rural</span>}</td>
                            <td className="text-slate-500">{lo?.region}</td>
                            <td className="text-right font-mono">{Number(l.score).toFixed(1)}</td>
                            <td className="text-right font-mono text-slate-500">{l.population_eligible?.toLocaleString("fr-FR")}</td>
                            <td className="text-right font-mono">{l.quota_score}</td>
                            <td className="text-right font-mono text-pass-orange">{l.quota_reserve || ""}</td>
                            <td className="text-right font-mono font-bold">{l.quota_total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {exclues.length > 0 && (
                <div className="card p-5">
                  <div className="font-semibold flex items-center gap-2 mb-3"><Filter size={16} className="text-slate-400" /> Localités exclues ({exclues.length}) — filtres éliminatoires</div>
                  <div className="space-y-1.5">
                    {exclues.map((l) => {
                      const lo = nomLoc(l.identifiant_localite);
                      return (
                        <div key={l.id_ligne} className="flex items-center justify-between text-sm rounded-lg border border-slate-200 px-3 py-2">
                          <span className="flex items-center gap-2">
                            {l.quota_reserve > 0 ? <CheckCircle2 size={15} className="text-pass-orange" /> : <XCircle size={15} className="text-red-500" />}
                            {lo?.nom} <span className="text-xs text-slate-400">· {lo?.region}</span>
                          </span>
                          <span className="text-xs text-slate-500">{l.motif_exclusion}{l.quota_reserve > 0 && <span className="text-pass-orange font-semibold"> · réserve +{l.quota_reserve}</span>}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
