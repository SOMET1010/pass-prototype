import { ReactNode } from "react";
import { X } from "lucide-react";
import type { StatutTache, Priorite, StatutDecision, Gravite, Maitrise, StatutJalon, StatutRelation } from "../types";

export function Chip({ color, children }: { color: string; children: ReactNode }) {
  return <span className={`chip ${color}`}>{children}</span>;
}

const TACHE: Record<StatutTache, [string, string]> = {
  a_faire: ["bg-slate-100 text-slate-600", "À faire"],
  en_cours: ["bg-pass-blue-light text-pass-blue-dark", "En cours"],
  bloque: ["bg-red-100 text-red-700", "Bloqué"],
  fait: ["bg-emerald-100 text-emerald-700", "Fait"],
};
export const BadgeTache = ({ s }: { s: StatutTache }) => <Chip color={TACHE[s][0]}>{TACHE[s][1]}</Chip>;

const PRIO: Record<Priorite, [string, string]> = {
  haute: ["bg-red-100 text-red-700", "Haute"],
  moyenne: ["bg-amber-100 text-amber-700", "Moyenne"],
  basse: ["bg-slate-100 text-slate-500", "Basse"],
};
export const BadgePriorite = ({ p }: { p: Priorite }) => <Chip color={PRIO[p][0]}>{PRIO[p][1]}</Chip>;

const DECISION: Record<StatutDecision, [string, string]> = {
  a_instruire: ["bg-amber-100 text-amber-700", "À instruire"],
  instruite: ["bg-pass-blue-light text-pass-blue-dark", "Instruite"],
  rendue: ["bg-emerald-100 text-emerald-700", "Rendue"],
  sans_objet: ["bg-slate-100 text-slate-500", "Sans objet"],
};
export const BadgeDecision = ({ s }: { s: StatutDecision }) => <Chip color={DECISION[s][0]}>{DECISION[s][1]}</Chip>;

const JALON: Record<StatutJalon, [string, string]> = {
  a_venir: ["bg-slate-100 text-slate-600", "À venir"],
  en_cours: ["bg-pass-blue-light text-pass-blue-dark", "En cours"],
  atteint: ["bg-emerald-100 text-emerald-700", "Atteint"],
  en_retard: ["bg-red-100 text-red-700", "En retard"],
};
export const BadgeJalon = ({ s }: { s: StatutJalon }) => <Chip color={JALON[s][0]}>{JALON[s][1]}</Chip>;

const GRAVITE: Record<Gravite, [string, string]> = {
  critique: ["bg-red-100 text-red-700", "Critique"],
  elevee: ["bg-orange-100 text-orange-700", "Élevée"],
  moderee: ["bg-amber-100 text-amber-700", "Modérée"],
  faible: ["bg-slate-100 text-slate-500", "Faible"],
};
export const BadgeGravite = ({ g, label }: { g: Gravite; label?: string }) => <Chip color={GRAVITE[g][0]}>{label ?? GRAVITE[g][1]}</Chip>;

const MAITRISE: Record<Maitrise, [string, string]> = {
  interne: ["bg-emerald-100 text-emerald-700", "Interne"],
  partagee: ["bg-amber-100 text-amber-700", "Partagée"],
  hors_de_notre_main: ["bg-red-100 text-red-700", "Hors de notre main"],
};
export const BadgeMaitrise = ({ m }: { m: Maitrise }) => <Chip color={MAITRISE[m][0]}>{MAITRISE[m][1]}</Chip>;

const RELATION: Record<StatutRelation, [string, string]> = {
  a_engager: ["bg-slate-100 text-slate-600", "À engager"],
  en_cours: ["bg-pass-blue-light text-pass-blue-dark", "En cours"],
  engage: ["bg-teal-100 text-teal-700", "Engagé"],
  convention_signee: ["bg-emerald-100 text-emerald-700", "Convention signée"],
};
export const BadgeRelation = ({ s }: { s: StatutRelation }) => <Chip color={RELATION[s][0]}>{RELATION[s][1]}</Chip>;

export function Avancement({ valeur }: { valeur: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-pass-blue" style={{ width: `${valeur}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-500 w-9">{valeur}%</span>
    </div>
  );
}

export function EnTete({ titre, sous, action }: { titre: string; sous?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold">{titre}</h1>
        {sous && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{sous}</p>}
      </div>
      {action}
    </div>
  );
}

export function Modale({ titre, onClose, children, large }: { titre: string; onClose: () => void; children: ReactNode; large?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10" onClick={onClose}>
      <div className={`card w-full ${large ? "max-w-3xl" : "max-w-xl"} p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{titre}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Vide({ children }: { children: ReactNode }) {
  return <div className="card p-10 text-center text-slate-400 text-sm">{children}</div>;
}
