import { useCallback, useEffect, useState } from "react";
import { SlidersHorizontal, Loader2, History, Lock, Database } from "lucide-react";
import { chargerParametres, majParametre, chargerSources, majSource, LIBELLE_GROUPE, LIBELLE_MODE_SOURCE } from "../lib/eligibilite";
import { toast } from "../components/Toaster";
import { useAuth } from "../context/AuthContext";
import { formatDateHeure } from "../lib/rules";
import type { ModeSource, Parametre, SourceExterne } from "../lib/types";

const inputCls = "w-28 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pass-blue/30";

export function Parametres() {
  const { agent } = useAuth();
  const superviseur = agent?.role === "superviseur";
  const [params, setParams] = useState<Parametre[]>([]);
  const [sources, setSources] = useState<SourceExterne[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [motif, setMotif] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const [p, s] = await Promise.all([chargerParametres(), chargerSources()]);
    setParams(p); setSources(s);
    setEdit(Object.fromEntries(p.map((x) => [x.cle, x.valeur ?? ""])));
    setLoading(false);
  }, []);

  async function changerMode(s: SourceExterne, mode: ModeSource) {
    try { await majSource(s.code, mode, s.delai_max_sec, s.actif); toast("Mode de la source mis à jour.", "success"); await charger(); }
    catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
  }
  useEffect(() => { charger(); }, [charger]);

  async function enregistrer(cle: string) {
    setBusy(cle);
    try {
      await majParametre(cle, edit[cle], motif[cle] || "Mise à jour");
      toast("Paramètre mis à jour (nouvelle version).", "success");
      setMotif((m) => ({ ...m, [cle]: "" }));
      await charger();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setBusy(null); }
  }

  if (loading) return <div className="text-slate-400">Chargement…</div>;

  const groupes = Array.from(new Set(params.map((p) => p.groupe)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <SlidersHorizontal className="text-pass-blue" size={22} /> Paramètres du moteur d'éligibilité
        </h1>
        <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
          Conformément au CDC v3, poids, seuils et clés sont <strong>administrables</strong> — jamais inscrits dans le code.
          Chaque modification est <strong>horodatée, attribuée et versionnée</strong> ; l'ancienne valeur est archivée.
        </p>
      </div>

      {!superviseur && (
        <div className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
          <Lock size={14} /> Lecture seule — la modification des paramètres est réservée au superviseur.
        </div>
      )}

      {groupes.map((g) => (
        <div key={g} className="card p-5">
          <div className="font-semibold text-pass-blue-dark mb-3">{LIBELLE_GROUPE[g] ?? g}</div>
          <div className="space-y-2.5">
            {params.filter((p) => p.groupe === g).map((p) => (
              <div key={p.cle} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start border-b border-slate-100 last:border-0 pb-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {p.libelle}
                    {p.arrete
                      ? <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Arrêté</span>
                      : <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Non arrêté</span>}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{p.cle}{p.unite ? ` · ${p.unite}` : ""}</div>
                  {p.description && <div className="text-[11px] text-slate-500 mt-0.5">{p.description}</div>}
                  {p.maj_le && (
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <History size={11} /> maj {formatDateHeure(p.maj_le)}{p.motif ? ` — ${p.motif}` : ""}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className={inputCls}
                    value={edit[p.cle] ?? ""}
                    disabled={!superviseur}
                    onChange={(e) => setEdit((s) => ({ ...s, [p.cle]: e.target.value }))}
                  />
                  {superviseur && (
                    <>
                      <input
                        className="w-40 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                        placeholder="Motif"
                        value={motif[p.cle] ?? ""}
                        onChange={(e) => setMotif((s) => ({ ...s, [p.cle]: e.target.value }))}
                      />
                      <button
                        className="btn-ghost text-sm !py-1.5"
                        disabled={busy === p.cle || (edit[p.cle] ?? "") === (p.valeur ?? "")}
                        onClick={() => enregistrer(p.cle)}
                      >
                        {busy === p.cle ? <Loader2 size={14} className="animate-spin" /> : "Enregistrer"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Sources externes — modes d'accès (CDC v3 §4) */}
      <div className="card p-5">
        <div className="font-semibold text-pass-blue-dark mb-1 flex items-center gap-2"><Database size={17} /> Bases externes — modes d'accès</div>
        <p className="text-xs text-slate-500 mb-3 max-w-3xl">
          Aucune convention n'étant signée, le mode est configurable par source. Le mode <strong>déclaratif</strong>
          (dégradé) fait passer le contrôle correspondant en « à instruire ». Les champs demandés sont rattachés à la
          règle qui les consomme (stricte nécessité).
        </p>
        <div className="space-y-2.5">
          {sources.map((s) => (
            <div key={s.code} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <div className="text-sm font-medium">{s.libelle}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{s.code} · délai max {s.delai_max_sec}s</div>
                </div>
                <div className="flex items-center gap-2">
                  {(["fichier", "service", "declaratif"] as ModeSource[]).map((m) => (
                    <button key={m} disabled={!superviseur} onClick={() => changerMode(s, m)}
                      className={`text-xs rounded-full border px-2.5 py-1 ${
                        s.mode === m ? (m === "declaratif" ? "bg-amber-500 text-white border-amber-500" : "bg-pass-blue text-white border-pass-blue") : "border-slate-300 text-slate-500"}`}>
                      {LIBELLE_MODE_SOURCE[m].split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
              {s.champs?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.champs.map((c, i) => (
                    <span key={i} className="text-[10px] bg-slate-100 rounded px-1.5 py-0.5 text-slate-500">
                      <span className="font-mono text-slate-700">{c.champ}</span> → {c.regle}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        La somme des poids C1–C5 doit valoir 100. Les seuils P1 ≥ P2 ≥ P3. Ces contrôles de cohérence relèvent de la
        gouvernance du ciblage (décisions C-1 à C-8, revue du 18 août).
      </p>
    </div>
  );
}
