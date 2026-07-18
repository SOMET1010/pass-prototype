import { useEffect, useState } from "react";
import { Warehouse, Package, AlertTriangle, MapPin } from "lucide-react";
import { supabase } from "../lib/supabase";
import { CartographieDistribution } from "../components/CartographieDistribution";
import { coordZone } from "../lib/zones";
import type { StockPoint } from "../lib/types";

const SEUIL_ALERTE = 3;

export function Stock() {
  const [points, setPoints] = useState<StockPoint[]>([]);
  const [distZone, setDistZone] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: pts }, { data: dists }] = await Promise.all([
        supabase.from("v_stock_points").select("*").order("zone"),
        supabase.from("distribution").select("demande(personne(zone_residence))"),
      ]);
      setPoints((pts as StockPoint[]) ?? []);
      // distribués par zone (via la zone du bénéficiaire)
      const parZone: Record<string, number> = {};
      for (const d of (dists as unknown as { demande: { personne: { zone_residence: string } | null } | null }[]) ?? []) {
        const z = d.demande?.personne?.zone_residence;
        if (z) parZone[z] = (parZone[z] ?? 0) + 1;
      }
      setDistZone(parZone);
      setLoading(false);
    })();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-pass-blue-light text-pass-blue">
          <Warehouse size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Stock & points de retrait</h1>
          <p className="text-sm text-slate-500">
            Disponibilité des terminaux par centre de retrait. Total en stock : <strong>{stockTotal}</strong>.
          </p>
        </div>
      </div>

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
          const bas = p.stock <= SEUIL_ALERTE;
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
