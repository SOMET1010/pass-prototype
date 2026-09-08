// Source de vérité unique de la navigation : alimente à la fois les menus
// (groupés en Quotidien / Distribution / Gouvernance / Aide) et le fil d'Ariane.
import {
  LayoutDashboard, UserPlus, FolderKanban, Gavel, Search,
  Truck, Warehouse, Wrench,
  Map, SlidersHorizontal, FlaskConical, Activity,
  Info,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }
export interface NavGroup { label: string; items: NavItem[] }
export interface Crumb { label: string; to?: string }

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Quotidien",
    items: [
      { to: "/", label: "Accueil", icon: LayoutDashboard, end: true },
      { to: "/enrolement", label: "Enrôlement", icon: UserPlus },
      { to: "/dossiers", label: "Dossiers", icon: FolderKanban },
      { to: "/instruction", label: "Instruction", icon: Gavel },
      { to: "/recherche", label: "Recherche", icon: Search },
    ],
  },
  {
    label: "Distribution",
    items: [
      { to: "/logistique", label: "Logistique", icon: Truck },
      { to: "/stock", label: "Stock", icon: Warehouse },
      { to: "/sav", label: "SAV", icon: Wrench },
    ],
  },
  {
    label: "Gouvernance",
    items: [
      { to: "/ciblage-geo", label: "Ciblage géo.", icon: Map },
      { to: "/parametres", label: "Paramètres", icon: SlidersHorizontal },
      { to: "/simulateur", label: "Simulateur", icon: FlaskConical },
      { to: "/supervision", label: "Supervision", icon: Activity },
    ],
  },
  {
    label: "Aide",
    items: [
      { to: "/a-propos", label: "À propos", icon: Info },
    ],
  },
];

// Détail (routes hors menu) → segments de fil d'Ariane rattachés à leur groupe.
const DETAIL: Record<string, Crumb[]> = {
  "/verification": [{ label: "Quotidien" }, { label: "Dossiers", to: "/dossiers" }, { label: "Vérification" }],
  "/fiche": [{ label: "Quotidien" }, { label: "Dossiers", to: "/dossiers" }, { label: "Fiche dossier" }],
  "/convocation": [{ label: "Quotidien" }, { label: "Dossiers", to: "/dossiers" }, { label: "Convocation" }],
  "/avis": [{ label: "Quotidien" }, { label: "Dossiers", to: "/dossiers" }, { label: "Avis de décision" }],
  "/remise": [{ label: "Distribution" }, { label: "Remise du terminal" }],
  "/recu": [{ label: "Distribution" }, { label: "Reçu de remise" }],
  "/comparateur-voix": [{ label: "Aide" }, { label: "Comparateur de voix" }],
};

/** Groupe auquel appartient une route (pour surligner le bon menu). */
export function groupeDe(pathname: string): string | null {
  for (const g of NAV_GROUPS) {
    for (const it of g.items) {
      if (it.end ? pathname === it.to : (it.to !== "/" && pathname.startsWith(it.to))) return g.label;
    }
  }
  const seg = "/" + pathname.split("/")[1];
  const d = DETAIL[seg];
  return d?.[0]?.label ?? null;
}

/** Construit le fil d'Ariane pour une route donnée. Le dernier élément est la page courante. */
export function fildAriane(pathname: string): Crumb[] {
  if (pathname === "/") return [{ label: "Accueil" }];
  for (const g of NAV_GROUPS) {
    for (const it of g.items) {
      if (it.to !== "/" && it.to === pathname) {
        return [{ label: "Accueil", to: "/" }, { label: g.label }, { label: it.label }];
      }
    }
  }
  const seg = "/" + pathname.split("/")[1];
  const d = DETAIL[seg];
  if (d) return [{ label: "Accueil", to: "/" }, ...d];
  return [{ label: "Accueil", to: "/" }];
}
