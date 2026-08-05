import { useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useStore } from "../store/store";
import { useAuth } from "../auth/AuthContext";
import type { Risque, StatutRisque } from "../types";
import { EnTete, BadgeGravite, BadgeMaitrise, Modale } from "../components/ui";

const STATUTS: { id: StatutRisque; label: string }[] = [
  { id: "ouvert", label: "Ouvert" },
  { id: "sous_controle", label: "Sous contrôle" },
  { id: "clos", label: "Clos" },
];

export default function Risques() {
  const { data, updateRisque } = useStore();
  const { peutEcrire } = useAuth();
  const [sel, setSel] = useState<Risque | null>(null);

  const ordreG = { critique: 0, elevee: 1, moderee: 2, faible: 3 };
  const liste = [...data.risques].sort((a, b) => {
    if ((a.statut === "clos" ? 1 : 0) !== (b.statut === "clos" ? 1 : 0)) return a.statut === "clos" ? 1 : -1;
    return ordreG[a.gravite] - ordreG[b.gravite];
  });
  const chantier = (id?: string) => data.chantiers.find((c) => c.id === id)?.libelle ?? "—";

  return (
    <div>
      <EnTete titre="Registre des risques"
        sous="Ce qui peut décaler l'ensemble, ce qu'on y oppose, et le degré de maîtrise. Un blocage annoncé se traite ; un blocage découvert coûte des semaines." />

      <div className="space-y-3">
        {liste.map((r) => (
          <button key={r.id} onClick={() => setSel(r)}
            className={`card w-full text-left p-4 hover:shadow-md transition-shadow flex items-start gap-4 ${r.statut === "clos" ? "opacity-60" : ""}`}>
            {r.statut === "clos" ? <ShieldCheck size={18} className="text-emerald-500 mt-0.5" /> : <ShieldAlert size={18} className="text-pass-orange mt-0.5" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-800">{r.libelle}</span>
                <BadgeGravite g={r.gravite} />
                <BadgeMaitrise m={r.maitrise} />
              </div>
              {r.effet && <div className="text-xs text-red-600 mt-1">Effet : {r.effet}</div>}
              <div className="text-sm text-slate-600 mt-1"><span className="text-slate-400">Parade :</span> {r.parade}</div>
              <div className="text-xs text-slate-400 mt-1">{chantier(r.chantierId)}</div>
            </div>
          </button>
        ))}
      </div>

      {sel && (
        <Modale titre="Risque" onClose={() => setSel(null)}>
          <DetailRisque r={sel} peutEcrire={peutEcrire} chantier={chantier(sel.chantierId)}
            onSave={(patch) => { updateRisque(sel.id, patch); setSel(null); }} />
        </Modale>
      )}
    </div>
  );
}

function DetailRisque({ r, peutEcrire, chantier, onSave }: { r: Risque; peutEcrire: boolean; chantier: string; onSave: (p: Partial<Risque>) => void }) {
  const [statut, setStatut] = useState<StatutRisque>(r.statut);
  const [parade, setParade] = useState(r.parade);
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="font-semibold text-base">{r.libelle}</h3>
        <div className="flex gap-2 mt-2"><BadgeGravite g={r.gravite} label={`Gravité : ${r.gravite}`} /><BadgeGravite g={r.probabilite} label={`Probabilité : ${r.probabilite}`} /><BadgeMaitrise m={r.maitrise} /></div>
        <p className="text-xs text-slate-400 mt-1">{chantier}</p>
      </div>
      {r.effet && <div className="rounded-lg bg-red-50 text-red-800 p-3"><div className="text-xs uppercase tracking-wide mb-1">Effet</div>{r.effet}</div>}
      <div>
        <label className="field-label">Parade</label>
        <textarea className="field-input min-h-[70px]" value={parade} disabled={!peutEcrire} onChange={(e) => setParade(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Statut</label>
        <select className="field-input" value={statut} disabled={!peutEcrire} onChange={(e) => setStatut(e.target.value as StatutRisque)}>
          {STATUTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      {peutEcrire && <div className="flex justify-end"><button className="btn-primary" onClick={() => onSave({ statut, parade })}>Enregistrer</button></div>}
    </div>
  );
}
