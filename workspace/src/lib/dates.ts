// Utilitaires de dates, en français, sans dépendance externe.

export const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = parse(iso);
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatCourt(iso?: string): string {
  if (!iso) return "—";
  const d = parse(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function joursEntre(a: string, b: string): number {
  const ms = parse(b).getTime() - parse(a).getTime();
  return Math.round(ms / 86_400_000);
}

// Retard (négatif) ou reste à courir (positif) par rapport à la date de référence.
export function joursRestants(echeance: string, ref: string): number {
  return joursEntre(ref, echeance);
}

export function estEnRetard(echeance: string, ref: string): boolean {
  return joursEntre(ref, echeance) < 0;
}

export function libelleEcheance(echeance: string, ref: string): string {
  const j = joursRestants(echeance, ref);
  if (j < 0) return `en retard de ${Math.abs(j)} j`;
  if (j === 0) return "aujourd'hui";
  if (j === 1) return "demain";
  if (j <= 7) return `dans ${j} j`;
  if (j <= 31) return `dans ${Math.round(j / 7)} sem.`;
  return `dans ${Math.round(j / 30)} mois`;
}
