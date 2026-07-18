// Coordonnées approximatives des zones (projection lon/lat → viewBox 0..400 × 0..380)
// pour la cartographie de distribution. Silhouette stylisée de la Côte d'Ivoire.

export const CI_VIEWBOX = { w: 400, h: 380 };

// Silhouette stylisée (approximative, non cadastrale) de la Côte d'Ivoire.
export const CI_PATH =
  "M72,62 L268,50 Q312,48 322,86 L336,168 Q340,232 322,286 L300,338 Q292,352 268,348 L150,344 Q96,346 78,318 L50,214 Q42,150 52,104 Q58,74 72,62 Z";

export const ZONES_COORD: Record<string, { x: number; y: number }> = {
  Abidjan: { x: 300, y: 316 },
  Bouaké: { x: 232, y: 182 },
  Korhogo: { x: 196, y: 82 },
  Man: { x: 78, y: 198 },
  Odienné: { x: 74, y: 84 },
};

export function coordZone(zone: string): { x: number; y: number } | null {
  return ZONES_COORD[zone] ?? null;
}

import type { StockPoint } from "./types";

/**
 * Point de retrait recommandé pour un bénéficiaire : le point de sa zone qui a du
 * stock (le mieux approvisionné), sinon le point le mieux approvisionné toutes zones.
 */
export function pointRecommande(points: StockPoint[], zone: string): StockPoint | null {
  const avecStock = points.filter((p) => p.actif && p.stock > 0);
  if (avecStock.length === 0) return null;
  const memeZone = avecStock.filter((p) => p.zone === zone).sort((a, b) => b.stock - a.stock);
  if (memeZone.length) return memeZone[0];
  return [...avecStock].sort((a, b) => b.stock - a.stock)[0];
}
