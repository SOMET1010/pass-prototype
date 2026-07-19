import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Smartphone, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const COMPTES_DEMO = [
  { role: "Enrôlement", email: "enrolement@pass.demo" },
  { role: "Instructeur", email: "instructeur@pass.demo" },
  { role: "Remise", email: "remise@pass.demo" },
  { role: "Superviseur", email: "superviseur@pass.demo" },
];

export function Login() {
  const { signIn, session, agent } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("enrolement@pass.demo");
  const [password, setPassword] = useState("passdemo2026");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session && agent) {
    navigate("/", { replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) setError(error);
    else navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-pass-blue-light flex flex-col">
      <div className="bg-pass-orange text-white text-xs font-medium px-4 py-1.5 flex items-center justify-center gap-2 text-center">
        <ShieldAlert size={14} />
        Prototype de démonstration — données fictives, vérifications simulées.
      </div>
      <div className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-pass-blue text-white mb-3">
              <Smartphone size={28} />
            </div>
            <h1 className="text-2xl font-bold text-pass-blue-dark">Plateforme PASS</h1>
            <p className="text-sm text-slate-500 text-center">
              Programme d'Accès aux Smartphones Subventionnés · ANSUT
            </p>
          </div>

          <form onSubmit={submit} className="card p-6 space-y-4">
            <div>
              <label className="field-label">Adresse e-mail de l'agent</label>
              <input
                type="email"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="field-label">Mot de passe</label>
              <input
                type="password"
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <div className="mt-5 card p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              Comptes de démonstration (mot de passe : passdemo2026)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {COMPTES_DEMO.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => {
                    setEmail(c.email);
                    setPassword("passdemo2026");
                  }}
                  className="rounded-md border border-slate-200 px-3 py-2 text-left text-xs hover:border-pass-blue hover:bg-pass-blue-light transition-colors"
                >
                  <div className="font-semibold text-pass-blue">{c.role}</div>
                  <div className="text-slate-400 truncate">{c.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
