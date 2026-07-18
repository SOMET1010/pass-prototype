import { Link } from "react-router-dom";
import { UserPlus, FolderKanban, LayoutDashboard, ArrowRight, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { LIBELLE_ROLE } from "../lib/rules";

const PERSONAS = [
  { nom: "Mariam KOUASSI", cni: "CI-001-334455", cas: "Éligible complète (zone rurale, 2G)", attendu: "ÉLIGIBLE → parcours jusqu'au reçu" },
  { nom: "Adama TRAORÉ", cni: "CI-002-778899", cas: "A déjà reçu un terminal (2024)", attendu: "NON ÉLIGIBLE (non-cumul, RM-032)" },
  { nom: "Awa DIALLO", cni: "CI-003-112233", cas: "Sans ligne mobile", attendu: "À INSTRUIRE (RM-038)" },
  { nom: "KOFFI YAO N'GUESSAN", cni: "CI-004-556677", cas: "Nom opérateur ≠ nom CNI", attendu: "À INSTRUIRE (incohérence)" },
  { nom: "Fatou COULIBALY", cni: "CI-005-990011", cas: "Analphabète, consentement assisté", attendu: "ÉLIGIBLE (assisté avec témoin)" },
];

export function Accueil() {
  const { agent } = useAuth();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Bonjour, {agent?.identite.split(" (")[0]}</h1>
        <p className="text-slate-500">
          Vous êtes connecté·e en tant que <strong className="text-pass-blue">{agent && LIBELLE_ROLE[agent.role]}</strong>.
          Sélectionnez une action pour démarrer.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link to="/enrolement" className="card p-5 hover:border-pass-blue transition-colors group">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-pass-blue-light text-pass-blue mb-3">
            <UserPlus size={22} />
          </div>
          <div className="font-semibold text-slate-800">Nouvel enrôlement</div>
          <p className="text-sm text-slate-500 mt-1">Saisir une demande assistée et vérifier l'éligibilité.</p>
          <div className="mt-3 text-sm font-medium text-pass-blue flex items-center gap-1 group-hover:gap-2 transition-all">
            Démarrer <ArrowRight size={15} />
          </div>
        </Link>

        <Link to="/dossiers" className="card p-5 hover:border-pass-blue transition-colors group">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-pass-blue-light text-pass-blue mb-3">
            <FolderKanban size={22} />
          </div>
          <div className="font-semibold text-slate-800">Dossiers</div>
          <p className="text-sm text-slate-500 mt-1">Suivre les demandes, instruire, décider, remettre.</p>
          <div className="mt-3 text-sm font-medium text-pass-blue flex items-center gap-1 group-hover:gap-2 transition-all">
            Consulter <ArrowRight size={15} />
          </div>
        </Link>

        <Link to="/supervision" className="card p-5 hover:border-pass-blue transition-colors group">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-pass-blue-light text-pass-blue mb-3">
            <LayoutDashboard size={22} />
          </div>
          <div className="font-semibold text-slate-800">Supervision</div>
          <p className="text-sm text-slate-500 mt-1">Indicateurs, avancement par zone, journal d'audit.</p>
          <div className="mt-3 text-sm font-medium text-pass-blue flex items-center gap-1 group-hover:gap-2 transition-all">
            Piloter <ArrowRight size={15} />
          </div>
        </Link>
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-pass-blue" />
          <h2 className="text-lg font-semibold">Parcours de démonstration</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Cinq personas fictifs illustrent les cas de référence. Enrôlez-les via l'écran d'enrôlement (leur numéro de
          pièce est indiqué) pour observer chaque issue.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-200">
                <th className="py-2 pr-4 font-medium">Persona</th>
                <th className="py-2 pr-4 font-medium">Pièce (CNI)</th>
                <th className="py-2 pr-4 font-medium">Situation</th>
                <th className="py-2 font-medium">Issue attendue</th>
              </tr>
            </thead>
            <tbody>
              {PERSONAS.map((p) => (
                <tr key={p.cni} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-4 font-semibold text-slate-700">{p.nom}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">{p.cni}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{p.cas}</td>
                  <td className="py-2.5 text-slate-600">{p.attendu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
