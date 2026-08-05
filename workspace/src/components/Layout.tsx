import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Gavel, Flag, FolderKanban, ListChecks, ShieldAlert,
  FileText, Users, CalendarClock, LogOut, RotateCcw,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useStore } from "../store/store";
import { BoutonReglages } from "./gateway-ui";
import { decisionsBloquantes, tachesEnRetard } from "../lib/roadmap";
import { formatDate } from "../lib/dates";

const NAV = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/decisions", label: "Décisions", icon: Gavel, badge: "decisions" },
  { to: "/jalons", label: "Jalons", icon: Flag },
  { to: "/chantiers", label: "Chantiers", icon: FolderKanban },
  { to: "/taches", label: "Tâches", icon: ListChecks, badge: "retard" },
  { to: "/risques", label: "Risques", icon: ShieldAlert },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/partenaires", label: "Partenaires", icon: Users },
  { to: "/seances", label: "Séances", icon: CalendarClock },
];

export default function Layout() {
  const { roleLibelle, deconnecter } = useAuth();
  const { data, dateRef, setDateRef, reinitialiser } = useStore();
  const nav = useNavigate();

  const nbDecisions = decisionsBloquantes(data).length;
  const nbRetard = tachesEnRetard(data, dateRef).length;
  const badgeVal = (k?: string) => (k === "decisions" ? nbDecisions : k === "retard" ? nbRetard : 0);

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 bg-pass-blue-dark text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-xs uppercase tracking-widest text-pass-orange font-semibold">ANSUT</div>
          <div className="text-lg font-bold leading-tight">Pilotage PASS</div>
          <div className="text-[11px] text-white/50 mt-0.5">Workspace de programme</div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, end, badge }) => {
            const v = badgeVal(badge);
            return (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                    isActive ? "bg-white/10 text-white border-l-2 border-pass-orange" : "text-white/70 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                  }`
                }>
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {v > 0 && <span className="chip bg-pass-orange text-white text-[10px] px-1.5 py-0">{v}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-white/10 space-y-3">
          <label className="block">
            <span className="text-[11px] text-white/50">Date de référence</span>
            <input type="date" value={dateRef} onChange={(e) => setDateRef(e.target.value)}
              className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1 text-xs text-white" />
          </label>
          <div className="text-[11px] text-white/60">Connecté : <span className="text-white font-medium">{roleLibelle}</span></div>
          <BoutonReglages />
          <div className="flex gap-2">
            <button onClick={() => { if (confirm("Réinitialiser toutes les données du workspace ?")) reinitialiser(); }}
              className="btn btn-sm bg-white/10 text-white/80 hover:bg-white/20 flex-1"><RotateCcw size={13} /> Réinit.</button>
            <button onClick={() => { deconnecter(); nav("/login"); }}
              className="btn btn-sm bg-white/10 text-white/80 hover:bg-white/20 flex-1"><LogOut size={13} /> Quitter</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 bg-white border-b border-slate-200 flex items-center px-6 text-xs text-slate-500 gap-2">
          <span className="font-medium text-slate-700">{data.programme.libelle}</span>
          <span className="text-slate-300">·</span>
          <span>{data.programme.statut}</span>
          <span className="ml-auto">Référence : {formatDate(dateRef)}</span>
        </header>
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
