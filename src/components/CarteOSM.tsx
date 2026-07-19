import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ZONES_LATLON, CI_CENTER } from "../lib/zones";

interface ZoneData {
  zone: string;
  distribues: number;
  stock: number;
}

/** Carte OpenStreetMap (Leaflet) avec bulles par zone dimensionnées selon la distribution. */
export function CarteOSM({ data }: { data: ZoneData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView(CI_CENTER, 6);
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 12,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    // Recalcule la taille après montage (conteneur qui apparaît).
    setTimeout(() => map.invalidateSize(), 200);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const max = Math.max(1, ...data.map((d) => d.distribues));
    for (const d of data) {
      const ll = ZONES_LATLON[d.zone];
      if (!ll) continue;
      const radius = 10 + (d.distribues / max) * 26;
      L.circleMarker(ll, {
        radius,
        color: "#F08221",
        weight: 1.5,
        fillColor: "#F08221",
        fillOpacity: 0.45,
      })
        .bindTooltip(`${d.zone} : ${d.distribues} remis · ${d.stock} en stock`, { direction: "top" })
        .addTo(layer);
      L.marker(ll, {
        icon: L.divIcon({
          className: "",
          html: `<div style="font-weight:700;color:#7a3d06;font-size:12px;transform:translate(-50%,-50%)">${d.distribues}</div>`,
        }),
      }).addTo(layer);
    }
  }, [data]);

  return <div ref={containerRef} className="h-80 w-full rounded-lg overflow-hidden border border-slate-200 z-0" />;
}
