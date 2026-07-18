import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Agent } from "../lib/types";

interface AuthState {
  session: Session | null;
  agent: Agent | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAgent(currentSession: Session | null) {
    if (!currentSession) {
      setAgent(null);
      return;
    }
    const { data } = await supabase
      .from("agent")
      .select("*")
      .eq("user_id", currentSession.user.id)
      .maybeSingle();
    setAgent((data as Agent) ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadAgent(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      await loadAgent(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? traduireErreurAuth(error.message) : null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAgent(null);
  }

  return (
    <AuthContext.Provider value={{ session, agent, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function traduireErreurAuth(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "Identifiants invalides. Vérifiez l'e-mail et le mot de passe.";
  if (/email not confirmed/i.test(msg)) return "Adresse e-mail non confirmée.";
  return "Échec de la connexion : " + msg;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}
