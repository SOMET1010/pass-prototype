import { createContext, useContext, useState, ReactNode } from "react";
import type { RoleId } from "../types";
import { ROLES } from "../data/seed";

interface Auth {
  role: RoleId | null;
  roleLibelle: string;
  connecter: (r: RoleId) => void;
  deconnecter: () => void;
  peutEcrire: boolean; // droit d'écriture global (simplifié pour la V1)
  voitConfidentiel: boolean;
}

const Ctx = createContext<Auth | null>(null);
const KEY = "pass-workspace:role:v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<RoleId | null>(() => (localStorage.getItem(KEY) as RoleId) || null);

  const connecter = (r: RoleId) => { setRole(r); localStorage.setItem(KEY, r); };
  const deconnecter = () => { setRole(null); localStorage.removeItem(KEY); };

  const peutEcrire = role === "chef_programme" || role === "referent" || role === "direction_generale";
  const voitConfidentiel = role !== "observateur";
  const roleLibelle = ROLES.find((x) => x.id === role)?.libelle ?? "";

  return (
    <Ctx.Provider value={{ role, roleLibelle, connecter, deconnecter, peutEcrire, voitConfidentiel }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): Auth {
  const a = useContext(Ctx);
  if (!a) throw new Error("useAuth hors AuthProvider");
  return a;
}
