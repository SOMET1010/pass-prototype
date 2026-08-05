import { CalendarClock, Users, ClipboardList, ArrowRight } from "lucide-react";
import { useStore } from "../store/store";
import { EnTete, Vide } from "../components/ui";
import { formatDate, libelleEcheance } from "../lib/dates";

export default function Seances() {
  const { data, dateRef } = useStore();
  const liste = [...data.seances].sort((a, b) => a.date.localeCompare(b.date));
  const tache = (id: string) => data.taches.find((t) => t.id === id)?.libelle ?? id;

  return (
    <div>
      <EnTete titre="Séances & comités"
        sous="Comité opérationnel (hebdo), point DG (bimensuel), comité de pilotage (mensuel), conseil d'administration (trimestriel). Ordre du jour, relevé de décisions et actions générées." />

      {liste.length === 0 ? (
        <Vide>Aucune séance planifiée.</Vide>
      ) : (
        <div className="space-y-4">
          {liste.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-bold text-slate-800 flex items-center gap-2"><CalendarClock size={17} className="text-pass-blue" /> {s.instance}</h2>
                  <div className="text-xs text-slate-500 mt-0.5">{formatDate(s.date)} · <span className="text-pass-orange">{libelleEcheance(s.date, dateRef)}</span> · {s.rythme}</div>
                </div>
                {s.participants.length > 0 && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5"><Users size={13} /> {s.participants.join(", ")}</div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <Bloc titre="Ordre du jour" items={s.ordreDuJour} />
                <Bloc titre="Relevé de décisions" items={s.releveDecisions} vide="À l'issue de la séance" />
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1"><ClipboardList size={12} /> Actions générées</div>
                  {s.actionsGenerees.length === 0 ? <p className="text-xs text-slate-400">—</p> : (
                    <ul className="text-sm text-slate-700 space-y-1">
                      {s.actionsGenerees.map((id) => <li key={id} className="flex items-center gap-1.5"><ArrowRight size={13} className="text-pass-orange" /> {tache(id)}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Bloc({ titre, items, vide }: { titre: string; items: string[]; vide?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">{titre}</div>
      {items.length === 0 ? <p className="text-xs text-slate-400">{vide ?? "—"}</p> : (
        <ul className="text-sm text-slate-700 list-disc list-inside space-y-0.5">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
      )}
    </div>
  );
}
