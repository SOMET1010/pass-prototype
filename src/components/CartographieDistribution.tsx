import { CI_VIEWBOX, CI_PATH, coordZone } from "../lib/zones";

interface ZoneData {
  zone: string;
  distribues: number; // terminaux remis
  stock: number; // stock disponible
}

/** Carte stylisée de la distribution des terminaux par zone (bulles proportionnelles). */
export function CartographieDistribution({ data }: { data: ZoneData[] }) {
  const max = Math.max(1, ...data.map((d) => d.distribues));
  const total = data.reduce((s, d) => s + d.distribues, 0);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto] items-center">
      <div className="relative">
        <svg viewBox={`0 0 ${CI_VIEWBOX.w} ${CI_VIEWBOX.h}`} className="w-full max-w-md mx-auto">
          {/* Silhouette */}
          <path d={CI_PATH} fill="#E8F0FA" stroke="#1D56A3" strokeWidth={1.5} strokeOpacity={0.5} />
          {/* Bulles par zone */}
          {data.map((d) => {
            const c = coordZone(d.zone);
            if (!c) return null;
            const r = 8 + (d.distribues / max) * 22;
            return (
              <g key={d.zone}>
                <circle cx={c.x} cy={c.y} r={r} fill="#F08221" fillOpacity={0.28} />
                <circle cx={c.x} cy={c.y} r={Math.max(5, r * 0.5)} fill="#F08221" fillOpacity={0.85} />
                <text x={c.x} y={c.y + 4} textAnchor="middle" className="fill-white" fontSize={12} fontWeight={700}>
                  {d.distribues}
                </text>
                <text x={c.x} y={c.y - r - 5} textAnchor="middle" className="fill-slate-600" fontSize={12} fontWeight={600}>
                  {d.zone}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Légende / tableau */}
      <div className="min-w-52">
        <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Terminaux distribués</div>
        <ul className="space-y-1.5 text-sm">
          {[...data]
            .sort((a, b) => b.distribues - a.distribues)
            .map((d) => (
              <li key={d.zone} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-pass-orange" />
                  <span className="text-slate-600">{d.zone}</span>
                </span>
                <span className="text-slate-500">
                  <strong className="text-slate-800">{d.distribues}</strong> remis · {d.stock} en stock
                </span>
              </li>
            ))}
        </ul>
        <div className="mt-3 border-t border-slate-100 pt-2 text-sm text-slate-500">
          Total distribué : <strong className="text-slate-800">{total}</strong>
        </div>
      </div>
    </div>
  );
}
