import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  UserPlus,
  FolderKanban,
  Info,
  LogOut,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { LIBELLE_ROLE } from "../lib/rules";

const NAV = [
  { to: "/", label: "Accueil", icon: LayoutDashboard, end: true },
  { to: "/enrolement", label: "Enrôlement", icon: UserPlus },
  { to: "/dossiers", label: "Dossiers", icon: FolderKanban },
  { to: "/supervision", label: "Supervision", icon: LayoutDashboard },
  { to: "/a-propos", label: "À propos", icon: Info },
];

export function Layout({ children }: { children: ReactNode }) {
  const { agent, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Bandeau prototype — permanent */}
      <div className="no-print bg-pass-orange text-white text-xs md:text-sm font-medium px-4 py-1.5 flex items-center justify-center gap-2 text-center">
        <ShieldAlert size={15} className="shrink-0" />
        <span>
          <strong>Prototype de démonstration</strong> — vérifications simulées, données fictives, hébergement non
          souverain. Non destiné à la production.
        </span>
      </div>

      {/* En-tête */}
      <header className="no-print bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-pass-blue text-white">
              <Smartphone size={22} />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-pass-blue-dark text-lg">PASS</div>
              <div className="text-[11px] text-slate-500 -mt-0.5">Accès au Smartphone Subventionné · ANSUT</div>
            </div>
          </div>
          {agent && (
            <div className="flex items-center gap-4">
              <div className="text-right leading-tight hidden sm:block">
                <div className="text-sm font-semibold text-slate-700">{agent.identite}</div>
                <div className="text-[11px] text-pass-blue font-medium">{LIBELLE_ROLE[agent.role]}</div>
              </div>
              <button onClick={handleLogout} className="btn-ghost !px-3 !py-2" title="Se déconnecter">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="mx-auto max-w-6xl px-2 flex gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-pass-blue text-pass-blue"
                    : "border-transparent text-slate-500 hover:text-pass-blue hover:border-slate-300"
                }`
              }
            >
              <item.icon size={16} /> {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>

      <footer className="no-print border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Prototype PASS · ANSUT — Programme d'Accès au Smartphone Subventionné · Données fictives
      </footer>
    </div>
  );
}
