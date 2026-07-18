import { useRef } from "react";
import { Download } from "lucide-react";
import { CI_VIEWBOX, CI_PATH, coordZone } from "../lib/zones";

interface ZoneData {
  zone: string;
  distribues: number; // terminaux remis
  stock: number; // stock disponible
}

/** Carte stylisée de la distribution des terminaux par zone (bulles proportionnelles). */
export function CartographieDistribution({ data }: { data: ZoneData[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const max = Math.max(1, ...data.map((d) => d.distribues));
  const total = data.reduce((s, d) => s + d.distribues, 0);

  function exporterPng() {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = CI_VIEWBOX.w * scale;
      canvas.height = CI_VIEWBOX.h * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "cartographie-distribution-pass.png";
      a.click();
    };
    img.src = src;
  }

  return (
    <div>
      <div className="flex justify-end no-print -mt-1 mb-2">
        <button onClick={exporterPng} className="btn-ghost !py-1.5 !px-3 text-xs">
          <Download size={14} /> Exporter (PNG)
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_auto] items-center">
        <div>
          <svg ref={svgRef} viewBox={`0 0 ${CI_VIEWBOX.w} ${CI_VIEWBOX.h}`} className="w-full max-w-md mx-auto" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width={CI_VIEWBOX.w} height={CI_VIEWBOX.h} fill="#ffffff" />
            <path d={CI_PATH} fill="#E8F0FA" stroke="#1D56A3" strokeWidth={1.5} strokeOpacity={0.5} />
            {data.map((d) => {
              const c = coordZone(d.zone);
              if (!c) return null;
              const r = 8 + (d.distribues / max) * 22;
              return (
                <g key={d.zone}>
                  <circle cx={c.x} cy={c.y} r={r} fill="#F08221" fillOpacity={0.28} />
                  <circle cx={c.x} cy={c.y} r={Math.max(5, r * 0.5)} fill="#F08221" fillOpacity={0.85} />
                  <text x={c.x} y={c.y + 4} textAnchor="middle" fill="#ffffff" fontSize={12} fontWeight={700} fontFamily="sans-serif">
                    {d.distribues}
                  </text>
                  <text x={c.x} y={c.y - r - 5} textAnchor="middle" fill="#475569" fontSize={12} fontWeight={600} fontFamily="sans-serif">
                    {d.zone}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

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
    </div>
  );
}
