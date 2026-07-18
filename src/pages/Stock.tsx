import { useCallback, useEffect, useState } from "react";
import { Warehouse, Package, AlertTriangle, MapPin, ArrowRightLeft, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toaster";
import { CartographieDistribution } from "../components/CartographieDistribution";
import { coordZone } from "../lib/zones";
import type { StockPoint } from "../lib/types";

const SEUIL_KEY = "pass_seuil_stock";

export function Stock() {
  const { agent } = useAuth();
  const [points, setPoints] = useState<StockPoint[]>([]);
  const [distZone, setDistZone] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [seuil, setSeuil] = useState<number>(() => Number(localStorage.getItem(SEUIL_KEY) ?? 3));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [qte, setQte] = useState(1);
  const [busy, setBusy] = useState(false);

  const charger = useCallback(async () => {
    const [{ data: pts }, { data: dists }] = await Promise.all([
      supabase.from("v_stock_points").select("*").order("zone"),
      supabase.from("distribution").select("demande(personne(zone_residence))"),
    ]);
    setPoints((pts as StockPoint[]) ?? []);
    const parZone: Record<string, number> = {};
    for (const d of (dists as unknown as { demande: { personne: { zone_residence: string } | null } | null }[]) ?? []) {
      const z = d.demande?.personne?.zone_residence;
      if (z) parZone[z] = (parZone[z] ?? 0) + 1;
    }
    setDistZone(parZone);
    setLoading(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  function majSeuil(v: number) {
    const n = Math.max(0, v);
    setSeuil(n);
    localStorage.setItem(SEUIL_KEY, String(n));
  }

  async function reassortir() {
    if (!from || !to) return toast("Choisissez les centres source et destination.", "error");
    setBusy(true);
    const { data, error } = await supabase.rpc("pass_transferer_stock", {
      p_from: from,
      p_to: to,
      p_quantite: qte,
    });
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast(`${data} terminal(aux) transféré(s).`, "success");
    setFrom("");
    setTo("");
    setQte(1);
    charger();
  }

  if (loading) return <div className="text-slate-400">Chargement…</div>;

  const stockTotal = points.reduce((s, p) => s + p.stock, 0);
  const zones = Array.from(new Set(points.map((p) => p.zone)));
  const dataCarte = zones
    .filter((z) => coordZone(z))
    .map((z) => ({
      zone: z,
      distribues: distZone[z] ?? 0,
      stock: points.filter((p) => p.zone === z).reduce((s, p) => s + p.stock, 0),
    }));
  const estSuperviseur = agent?.role === "superviseur";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-pass-blue-light text-pass-blue">
            <Warehouse size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Stock & points de retrait</h1>
            <p className="text-sm text-slate-500">
              Total en stock : <strong>{stockTotal}</strong> terminaux répartis sur {points.length} centres.
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Seuil d'alerte
          <input
            type="number"
            min={0}
            className="field-input !py-1.5 w-20"
            value={seuil}
            onChange={(e) => majSeuil(Number(e.target.value))}
          />
        </label>
      </div>

      {/* Réassort (superviseur) */}
      {estSuperviseur && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRightLeft size={18} className="text-pass-blue" />
            <h2 className="text-base font-semibold">Réassort entre centres</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] items-end">
            <div>
              <label className="field-label">Depuis</label>
              <select className="field-input" value={from} onChange={(e) => setFrom(e.target.value)}>
                <option value="">— Centre source —</option>
                {points.map((p) => (
                  <option key={p.id_point} value={p.id_point}>
                    {p.libelle} ({p.stock})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Vers</label>
              <select className="field-input" value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="">— Centre destination —</option>
                {points.map((p) => (
                  <option key={p.id_point} value={p.id_point}>
                    {p.libelle} ({p.stock})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Quantité</label>
              <input
                type="number"
                min={1}
                className="field-input w-24"
                value={qte}
                onChange={(e) => setQte(Number(e.target.value))}
              />
            </div>
            <button onClick={reassortir} className="btn-primary" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />} Transférer
            </button>
          </div>
        </div>
      )}

      {/* Cartographie */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={18} className="text-pass-blue" />
          <h2 className="text-base font-semibold">Cartographie de la distribution</h2>
        </div>
        <CartographieDistribution data={dataCarte} />
      </div>

      {/* Points de retrait */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {points.map((p) => {
          const bas = p.stock <= seuil;
          return (
            <div key={p.id_point} className={`card p-4 ${bas ? "border-pass-orange/50" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{p.libelle}</div>
                  <div className="text-xs text-slate-400">{p.zone}</div>
                </div>
                <div className={`grid h-9 w-9 place-items-center rounded-lg ${bas ? "bg-pass-orange-light text-pass-orange" : "bg-pass-blue-light text-pass-blue"}`}>
                  <Package size={18} />
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-800">{p.stock}</div>
                  <div className="text-xs text-slate-500">en stock · {p.remis} remis</div>
                </div>
                {bas && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-pass-orange-light px-2 py-0.5 text-[11px] font-semibold text-pass-orange">
                    <AlertTriangle size={12} /> Stock bas
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
