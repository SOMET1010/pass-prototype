import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LogOut, ShieldAlert, PlayCircle, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { lancerDemo } from "./DemoTour";
import { Breadcrumb } from "./Breadcrumb";
import { NAV_GROUPS, groupeDe } from "../lib/navigation";
import { LIBELLE_ROLE } from "../lib/rules";
import ansutLogo from "../assets/ansut-logo.svg";

export function Layout({ children }: { children: ReactNode }) {
  const { agent, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const groupeActif = groupeDe(pathname);

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  // Ferme le menu déroulant lors d'un changement de page ou d'un clic extérieur.
  useEffect(() => { setOpenGroup(null); }, [pathname]);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") setOpenGroup(null); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, []);

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
            <img src={ansutLogo} alt="ANSUT" className="h-9 w-auto" />
            <div className="h-8 w-px bg-slate-200" />
            <div className="leading-tight">
              <div className="font-bold text-pass-blue-dark text-base">PASS</div>
              <div className="text-[11px] text-slate-500 -mt-0.5">Programme d'Accès aux Smartphones Subventionnés</div>
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

        {/* Navigation groupée (menus déroulants) */}
        <nav ref={navRef} className="mx-auto max-w-6xl px-2 flex gap-1 relative">
          {NAV_GROUPS.map((g) => {
            const actif = groupeActif === g.label;
            const ouvert = openGroup === g.label;
            return (
              <div key={g.label} className="relative">
                <button
                  onClick={() => setOpenGroup((o) => (o === g.label ? null : g.label))}
                  aria-expanded={ouvert}
                  aria-haspopup="true"
                  className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    actif
                      ? "border-pass-blue text-pass-blue"
                      : "border-transparent text-slate-500 hover:text-pass-blue hover:border-slate-300"
                  }`}
                >
                  {g.label}
                  <ChevronDown size={14} className={`transition-transform ${ouvert ? "rotate-180" : ""}`} />
                </button>

                {ouvert && (
                  <div className="absolute left-0 top-full z-50 mt-0.5 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    {g.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setOpenGroup(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-pass-blue-light text-pass-blue"
                              : "text-slate-600 hover:bg-slate-50 hover:text-pass-blue"
                          }`
                        }
                      >
                        <item.icon size={16} className="shrink-0" /> {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
        <Breadcrumb />
        {children}
      </main>

      {/* Bouton flottant — lance la démonstration guidée auto-jouée */}
      <button
        onClick={() => lancerDemo()}
        className="no-print fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-pass-orange text-white font-semibold px-4 py-2.5 shadow-lg hover:bg-pass-orange/90"
        title="Lancer la démonstration guidée"
      >
        <PlayCircle size={18} /> Démonstration
      </button>

      <footer className="no-print border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Prototype PASS · ANSUT — Programme d'Accès aux Smartphones Subventionnés · Données fictives
      </footer>
    </div>
  );
}
