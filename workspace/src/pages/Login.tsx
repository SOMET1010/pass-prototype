import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ROLES } from "../data/seed";

export default function Login() {
  const { connecter } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-pass-blue-dark p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-xs uppercase tracking-widest text-pass-orange font-semibold">ANSUT</div>
        <h1 className="text-2xl font-bold mt-1">Pilotage PASS</h1>
        <p className="text-sm text-slate-500 mt-1">
          Workspace interne de gestion du programme. Choisissez votre rôle pour entrer.
        </p>
        <div className="mt-6 space-y-2">
          {ROLES.map((r) => (
            <button key={r.id} onClick={() => { connecter(r.id); nav("/"); }}
              className="w-full text-left rounded-lg border border-slate-200 px-4 py-3 hover:border-pass-blue hover:bg-pass-blue-light/40 transition-colors">
              <div className="font-semibold text-pass-blue-dark">{r.libelle}</div>
              <div className="text-xs text-slate-500">{r.description}</div>
            </button>
          ))}
        </div>
        <p className="mt-6 text-[11px] text-slate-400 flex items-start gap-1.5">
          <ShieldCheck size={14} className="shrink-0 mt-0.5" />
          Outil interne — aucune donnée de bénéficiaire. Authentification par rôle (démonstration) ;
          l'annuaire d'entreprise pourra être branché ultérieurement.
        </p>
      </div>
    </div>
  );
}
