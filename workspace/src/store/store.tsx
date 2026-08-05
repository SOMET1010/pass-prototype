import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { WorkspaceData, Tache, Decision, Risque, Document, Partenaire, Relance } from "../types";
import { SEED, DATE_REFERENCE } from "../data/seed";

const STORAGE_KEY = "pass-workspace:data:v1";
const REF_KEY = "pass-workspace:ref:v1";

interface Store {
  data: WorkspaceData;
  dateRef: string;
  setDateRef: (d: string) => void;
  updateTache: (id: string, patch: Partial<Tache>) => void;
  ajouterRelance: (id: string, r: Relance) => void;
  updateDecision: (id: string, patch: Partial<Decision>) => void;
  updateRisque: (id: string, patch: Partial<Risque>) => void;
  updatePartenaire: (id: string, patch: Partial<Partenaire>) => void;
  ajouterDocument: (doc: Document) => void;
  supprimerDocument: (id: string) => void;
  reinitialiser: () => void;
}

const Ctx = createContext<Store | null>(null);

function charger(): WorkspaceData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WorkspaceData;
  } catch { /* ignore */ }
  return structuredClone(SEED);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WorkspaceData>(charger);
  const [dateRef, setDateRefState] = useState<string>(() => localStorage.getItem(REF_KEY) || DATE_REFERENCE);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { localStorage.setItem(REF_KEY, dateRef); }, [dateRef]);

  const store = useMemo<Store>(() => ({
    data,
    dateRef,
    setDateRef: setDateRefState,
    updateTache: (id, patch) =>
      setData((d) => ({ ...d, taches: d.taches.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    ajouterRelance: (id, r) =>
      setData((d) => ({ ...d, taches: d.taches.map((t) => (t.id === id ? { ...t, relances: [...t.relances, r] } : t)) })),
    updateDecision: (id, patch) =>
      setData((d) => ({ ...d, decisions: d.decisions.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    updateRisque: (id, patch) =>
      setData((d) => ({ ...d, risques: d.risques.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    updatePartenaire: (id, patch) =>
      setData((d) => ({ ...d, partenaires: d.partenaires.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    ajouterDocument: (doc) => setData((d) => ({ ...d, documents: [doc, ...d.documents] })),
    supprimerDocument: (id) => setData((d) => ({ ...d, documents: d.documents.filter((x) => x.id !== id) })),
    reinitialiser: () => { setData(structuredClone(SEED)); setDateRefState(DATE_REFERENCE); },
  }), [data, dateRef]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore hors StoreProvider");
  return s;
}
