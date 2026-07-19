import { useCallback, useEffect, useState } from "react";
import { Wrench, ShieldX, Smartphone, CheckCircle2, Loader2, RefreshCcw } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toaster";
import { LIBELLE_SAV_TYPE, LIBELLE_SAV_STATUT, LIBELLE_STATUT_TERMINAL, formatDateHeure } from "../lib/rules";
import type { SavTicket, StatutSav, Terminal } from "../lib/types";

interface Row extends SavTicket {
  distribution: {
    point_remise: string;
    terminal: { modele: string; imei: string; statut: string } | null;
    demande: { numero_dossier: string; personne: { nom: string; prenoms: string } | null } | null;
  } | null;
}

const FILTRES: { v: "all" | StatutSav; l: string }[] = [
  { v: "all", l: "Tous" },
  { v: "ouvert", l: "Ouverts" },
  { v: "en_cours", l: "En cours" },
  { v: "resolu", l: "Résolus" },
];

export function Sav() {
  const { agent } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [stock, setStock] = useState<Terminal[]>([]);
  const [filtre, setFiltre] = useState<"all" | StatutSav>("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [traitId, setTraitId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [remplId, setRemplId] = useState("");

  const charger = useCallback(async () => {
    const [{ data }, { data: term }] = await Promise.all([
      supabase
        .from("sav_ticket")
        .select("*, distribution(point_remise, terminal(modele,imei,statut), demande(numero_dossier, personne(nom,prenoms)))")
        .order("created_at", { ascending: false }),
      supabase.from("terminal").select("*").eq("statut", "en_stock").order("modele"),
    ]);
    setRows((data as unknown as Row[]) ?? []);
    setStock((term as Terminal[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const peutTraiter = agent?.role === "remise" || agent?.role === "superviseur";

  async function prendreEnCharge(id: string) {
    setBusy(true);
    const { error } = await supabase.rpc("pass_traiter_sav", { p_id_ticket: id, p_statut: "en_cours", p_resolution: null });
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast("Ticket pris en charge.", "success");
    charger();
  }

  async function resoudre(id: string) {
    setBusy(true);
    const { error } = await supabase.rpc("pass_traiter_sav", {
      p_id_ticket: id,
      p_statut: "resolu",
      p_resolution: resolution || "Traité",
      p_id_terminal_remplacement: remplId || null,
    });
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast(remplId ? "Ticket résolu, terminal remplacé." : "Ticket résolu.", "success");
    setTraitId(null);
    setResolution("");
    setRemplId("");
    charger();
  }

  const filtered = rows.filter((r) => filtre === "all" || r.statut === filtre);
  const ouverts = rows.filter((r) => r.statut !== "resolu").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-pass-blue-light text-pass-blue">
          <Wrench size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Service après-vente (SAV)</h1>
          <p className="text-sm text-slate-500">
            Suivi des terminaux après remise : perte, vol, panne, remplacement. {ouverts} ticket(s) en cours.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTRES.map((f) => (
          <button
            key={f.v}
            onClick={() => setFiltre(f.v)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filtre === f.v ? "bg-pass-blue text-white" : "bg-white border border-slate-300 text-slate-600"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-400 text-sm">Aucun ticket SAV.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const term = r.distribution?.terminal;
            const pers = r.distribution?.demande?.personne;
            const vol = r.type_incident === "vol";
            return (
              <div key={r.id_ticket} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${vol ? "bg-red-50 text-red-700 border border-red-300" : "bg-amber-50 text-amber-700 border border-amber-300"}`}>
                        {vol ? <ShieldX size={12} /> : <Wrench size={12} />} {LIBELLE_SAV_TYPE[r.type_incident]}
                      </span>
                      <SavStatut statut={r.statut} />
                    </div>
                    <div className="mt-1 font-semibold text-slate-800">
                      {pers ? `${pers.nom} ${pers.prenoms}` : "—"}
                      <span className="ml-2 font-mono text-xs text-slate-400">{r.distribution?.demande?.numero_dossier}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Smartphone size={13} />
                      {term ? (
                        <>
                          {term.modele} · IMEI {term.imei} ·{" "}
                          <span className={term.statut === "bloque" || term.statut === "perdu" ? "text-red-600 font-medium" : ""}>
                            {LIBELLE_STATUT_TERMINAL[term.statut]}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                    {r.description && <p className="mt-2 text-sm text-slate-600">{r.description}</p>}
                    {r.statut === "resolu" && r.resolution && (
                      <p className="mt-1 text-sm text-emerald-700">Résolution : {r.resolution}</p>
                    )}
                    <div className="mt-1 text-xs text-slate-400">Ouvert le {formatDateHeure(r.created_at)}</div>
                  </div>

                  {peutTraiter && r.statut !== "resolu" && (
                    <div className="flex flex-col items-end gap-2">
                      {r.statut === "ouvert" && (
                        <button onClick={() => prendreEnCharge(r.id_ticket)} className="btn-ghost !py-1.5" disabled={busy}>
                          <RefreshCcw size={14} /> Prendre en charge
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setTraitId(traitId === r.id_ticket ? null : r.id_ticket);
                          setResolution("");
                          setRemplId("");
                        }}
                        className="btn-primary !py-1.5"
                      >
                        <CheckCircle2 size={14} /> Résoudre
                      </button>
                    </div>
                  )}
                </div>

                {traitId === r.id_ticket && (
                  <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                    <textarea
                      className="field-input"
                      rows={2}
                      placeholder="Résolution (ex. remplacement effectué, réparation, IMEI bloqué…)"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                    />
                    <div className="flex flex-wrap items-end gap-2">
                      <div>
                        <label className="field-label">Remplacer le terminal (optionnel)</label>
                        <select className="field-input" value={remplId} onChange={(e) => setRemplId(e.target.value)}>
                          <option value="">— Sans remplacement —</option>
                          {stock.map((t) => (
                            <option key={t.id_terminal} value={t.id_terminal}>
                              {t.modele} · IMEI {t.imei}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button onClick={() => resoudre(r.id_ticket)} className="btn-primary" disabled={busy}>
                        {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirmer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SavStatut({ statut }: { statut: StatutSav }) {
  const cls: Record<StatutSav, string> = {
    ouvert: "bg-red-50 text-red-700 border-red-300",
    en_cours: "bg-amber-50 text-amber-700 border-amber-300",
    resolu: "bg-emerald-50 text-emerald-700 border-emerald-300",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls[statut]}`}>
      {LIBELLE_SAV_STATUT[statut]}
    </span>
  );
}
