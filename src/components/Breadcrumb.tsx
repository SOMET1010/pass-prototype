import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { fildAriane } from "../lib/navigation";

/** Fil d'Ariane — indique où l'on se trouve dans l'arborescence (Accueil › Groupe › Page). */
export function Breadcrumb() {
  const { pathname } = useLocation();
  const crumbs = fildAriane(pathname);
  if (pathname === "/") return null; // pas de fil d'Ariane sur l'accueil

  return (
    <nav aria-label="Fil d'Ariane" className="no-print mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-slate-500">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={14} className="text-slate-300 shrink-0" />}
              {c.to && !last ? (
                <Link to={c.to} className="inline-flex items-center gap-1 hover:text-pass-blue transition-colors">
                  {i === 0 && <Home size={13} />}
                  {c.label}
                </Link>
              ) : (
                <span className={`inline-flex items-center gap-1 ${last ? "font-semibold text-slate-700" : ""}`} aria-current={last ? "page" : undefined}>
                  {i === 0 && <Home size={13} />}
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
