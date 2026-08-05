import { useState } from "react";
import { Gavel, AlertOctagon, Link2 } from "lucide-react";
import { useStore } from "../store/store";
import { useAuth } from "../auth/AuthContext";
import type { Decision, StatutDecision } from "../types";
import { EnTete, BadgeDecision, Modale, Vide } from "../components/ui";
import { formatDate, libelleEcheance, estEnRetard } from "../lib/dates";
import { decisionsBloquantes } from "../lib/roadmap";

const STATUTS: { id: StatutDecision; label: string }[] = [
  { id: "a_instruire", label: "À instruire" },
  { id: "instruite", label: "Instruite" },
  { id: "rendue", label: "Rendue" },
  { id: "sans_objet", label: "Sans objet" },
];

export default function Decisions() {
  const { data, dateRef, updateDecision } = useStore();
  const { peutEcrire } = useAuth();
  const [filtreBloq, setFiltreBloq] = useState(false);
  const [edit, setEdit] = useState<Decision | null>(null);

  const liste = [...data.decisions]
    .filter((d) => (filtreBloq ? d.bloquante : true))
    .sort((a, b) => {
      const rendu = (x: Decision) => (x.statut === "rendue" || x.statut === "sans_objet" ? 1 : 0);
      if (rendu(a) !== rendu(b)) return rendu(a) - rendu(b);
      return (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999");
    });

  const nbBloq = decisionsBloquantes(data).length;
  const nomJalon = (id: string) => data.jalons.find((j) => j.id === id)?.libelle ?? id;

  return (
    <div>
      <EnTete titre="Registre des décisions"
        sous="Le besoin le plus aigu du pilotage : qui décide, à quelle échéance, et ce qui est bloqué tant que la décision n'est pas rendue."
        action={
          <button onClick={() => setFiltreBloq((v) => !v)} className={filtreBloq ? "btn-accent" : "btn-ghost"}>
            <AlertOctagon size={16} /> {filtreBloq ? "Toutes les décisions" : "Bloquantes seulement"}
          </button>
        } />

      {nbBloq > 0 && (
        <div className="card border border-red-200 bg-red-50 p-4 mb-5 text-sm text-red-800">
          <strong>{nbBloq} décision(s) bloquante(s) non rendue(s).</strong> Sans les arbitrages de mi-août, la publication de l'appel d'offres glisse — et tout l'aval du calendrier avec elle.
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-4 py-3">Décision</th>
              <th className="text-left font-medium px-4 py-3">Instance</th>
              <th className="text-left font-medium px-4 py-3">Échéance</th>
              <th className="text-left font-medium px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {liste.map((d) => {
              const retard = d.echeance && estEnRetard(d.echeance, dateRef) && d.statut !== "rendue" && d.statut !== "sans_objet";
              return (
                <tr key={d.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setEdit(d)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium text-slate-800">
                      {d.bloquante && <span className="chip bg-red-100 text-red-700 text-[10px]">Bloquante</span>}
                      {d.libelle}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Link2 size={12} /> {d.ceQuElleConditionne}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.instance}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>{formatDate(d.echeance)}</div>
                    {d.echeance && d.statut !== "rendue" && (
                      <div className={`text-xs ${retard ? "text-red-600 font-medium" : "text-slate-400"}`}>{libelleEcheance(d.echeance, dateRef)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3"><BadgeDecision s={d.statut} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {liste.length === 0 && <Vide>Aucune décision.</Vide>}
      </div>

      {edit && (
        <Modale titre="Décision" onClose={() => setEdit(null)} large>
          <DetailDecision d={edit} peutEcrire={peutEcrire}
            nomJalon={nomJalon}
            onSave={(patch) => { updateDecision(edit.id, patch); setEdit(null); }} />
        </Modale>
      )}
    </div>
  );
}

function DetailDecision({ d, peutEcrire, nomJalon, onSave }: {
  d: Decision; peutEcrire: boolean; nomJalon: (id: string) => string; onSave: (p: Partial<Decision>) => void;
}) {
  const [statut, setStatut] = useState<StatutDecision>(d.statut);
  const [teneur, setTeneur] = useState(d.teneur ?? "");

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          {d.bloquante && <span className="chip bg-red-100 text-red-700 text-[10px]">Bloquante</span>}
          <Gavel size={16} className="text-pass-blue" />
          <h3 className="font-semibold text-base">{d.libelle}</h3>
        </div>
        <p className="text-sm text-slate-500 mt-1">Instance : <strong>{d.instance}</strong> · Échéance : {formatDate(d.echeance)}</p>
      </div>

      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ce qu'elle conditionne</div>
        {d.ceQuElleConditionne}
      </div>

      {d.jalonsBloques.length > 0 && (
        <div className="text-sm">
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Jalons débloqués par cette décision</div>
          <ul className="list-disc list-inside text-slate-700">
            {d.jalonsBloques.map((id) => <li key={id}>{nomJalon(id)}</li>)}
          </ul>
        </div>
      )}

      <div>
        <label className="field-label">Statut</label>
        <select className="field-input" value={statut} disabled={!peutEcrire} onChange={(e) => setStatut(e.target.value as StatutDecision)}>
          {STATUTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div>
        <label className="field-label">Teneur (ce qui a été décidé)</label>
        <textarea className="field-input min-h-[80px]" value={teneur} disabled={!peutEcrire}
          onChange={(e) => setTeneur(e.target.value)} placeholder="À renseigner une fois la décision rendue…" />
      </div>

      {peutEcrire ? (
        <div className="flex justify-end gap-2">
          <button className="btn-primary" onClick={() => onSave({
            statut, teneur,
            dateRendue: statut === "rendue" ? (d.dateRendue ?? new Date().toISOString().slice(0, 10)) : d.dateRendue,
          })}>Enregistrer</button>
        </div>
      ) : (
        <p className="text-xs text-slate-400">Lecture seule — votre rôle ne permet pas de modifier les décisions.</p>
      )}
    </div>
  );
}
