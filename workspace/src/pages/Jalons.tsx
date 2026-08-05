import { useState } from "react";
import { Flag, ArrowDownRight, ShieldAlert } from "lucide-react";
import { useStore } from "../store/store";
import type { Jalon } from "../types";
import { EnTete, BadgeJalon, Modale } from "../components/ui";
import { formatDate, libelleEcheance, parse } from "../lib/dates";
import { chaineAval, jalonsMenaces } from "../lib/roadmap";

const DEBUT = new Date(2026, 7, 1); // août 2026
const FIN = new Date(2027, 6, 31); // juil. 2027
const SPAN = FIN.getTime() - DEBUT.getTime();
const MOIS_LABELS = ["Août", "Sept", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul"];

const pos = (iso: string) => Math.max(0, Math.min(100, ((parse(iso).getTime() - DEBUT.getTime()) / SPAN) * 100));

const NATURE_LABEL: Record<string, string> = { reglementaire: "Réglementaire", industriel: "Industriel", interne: "Interne", decision: "Décision" };

export default function Jalons() {
  const { data, dateRef } = useStore();
  const [sel, setSel] = useState<Jalon | null>(null);
  const menaces = new Map(jalonsMenaces(data, dateRef).map((m) => [m.jalon.id, m.causes]));
  const jalons = [...data.jalons].sort((a, b) => a.datePrevue.localeCompare(b.datePrevue));
  const refPos = pos(dateRef);

  return (
    <div>
      <EnTete titre="Jalons décisifs"
        sous="Les délais réglementaires et industriels ne se compriment pas : aucun retard ne se rattrape en aval. Une semaine perdue en amont est une semaine de retard sur la remise du premier terminal." />

      {/* Frise chronologique */}
      <div className="card p-5 mb-6 overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="relative h-8 border-b border-slate-200">
            {MOIS_LABELS.map((m, i) => (
              <div key={i} className="absolute text-xs text-slate-400" style={{ left: `${(i / 12) * 100}%` }}>{m}</div>
            ))}
          </div>
          <div className="relative mt-8" style={{ height: `${jalons.length * 38 + 10}px` }}>
            {/* ligne date de référence */}
            <div className="absolute -top-6 bottom-0 w-px bg-pass-orange/60 z-10" style={{ left: `${refPos}%` }}>
              <span className="absolute -top-4 -translate-x-1/2 text-[10px] text-pass-orange font-medium whitespace-nowrap bg-white px-1">aujourd'hui</span>
            </div>
            {jalons.map((j, i) => {
              const menace = menaces.has(j.id);
              return (
                <div key={j.id} className="absolute flex items-center" style={{ top: `${i * 38}px`, left: 0, right: 0 }}>
                  <button onClick={() => setSel(j)} className="absolute -translate-x-1/2 flex items-center gap-1.5 group" style={{ left: `${pos(j.datePrevue)}%` }}>
                    <span className={`h-3.5 w-3.5 rotate-45 border-2 ${
                      j.statut === "atteint" ? "bg-emerald-500 border-emerald-600" : menace ? "bg-red-500 border-red-600" : "bg-pass-blue border-pass-blue-dark"
                    }`} />
                    <span className="text-xs text-slate-600 whitespace-nowrap group-hover:text-pass-blue max-w-[220px] truncate">{j.libelle}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Liste détaillée */}
      <div className="space-y-3">
        {jalons.map((j) => {
          const causes = menaces.get(j.id);
          return (
            <button key={j.id} onClick={() => setSel(j)} className="card w-full text-left p-4 hover:shadow-md transition-shadow flex items-start gap-4">
              <Flag size={18} className={causes ? "text-red-500 mt-0.5" : "text-pass-blue mt-0.5"} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800">{j.libelle}</span>
                  {j.decisif && <span className="chip bg-pass-orange-light text-pass-orange text-[10px]">Décisif</span>}
                  <BadgeJalon s={j.statut} />
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {formatDate(j.datePrevue)} · {libelleEcheance(j.datePrevue, dateRef)} · {NATURE_LABEL[j.nature]}
                </div>
                <div className="text-sm text-slate-600 mt-1 flex items-center gap-1"><ArrowDownRight size={13} /> {j.ceQuiEnDepend}</div>
                {causes && (
                  <div className="mt-2 text-xs text-red-700 bg-red-50 rounded p-2 flex items-start gap-1.5">
                    <ShieldAlert size={13} className="shrink-0 mt-0.5" /> <span>{causes.join(" · ")}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {sel && (
        <Modale titre={sel.libelle} onClose={() => setSel(null)} large>
          <DetailJalon j={sel} data={data} dateRef={dateRef} causes={menaces.get(sel.id)} />
        </Modale>
      )}
    </div>
  );
}

function DetailJalon({ j, data, dateRef, causes }: { j: Jalon; data: any; dateRef: string; causes?: string[] }) {
  const aval = chaineAval(j.id, data);
  const tachesLiees = data.taches.filter((t: any) => t.jalonId === j.id);
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <Info label="Échéance prévue" val={`${formatDate(j.datePrevue)} (${libelleEcheance(j.datePrevue, dateRef)})`} />
        <Info label="Nature" val={NATURE_LABEL[j.nature]} />
      </div>
      <div className="rounded-lg bg-slate-50 p-3">
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ce qui en dépend</div>{j.ceQuiEnDepend}
      </div>
      {causes && (
        <div className="rounded-lg bg-red-50 p-3 text-red-800">
          <div className="text-xs uppercase tracking-wide mb-1 flex items-center gap-1"><ShieldAlert size={13} /> Menaces actuelles</div>
          <ul className="list-disc list-inside">{causes.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
      )}
      {tachesLiees.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Tâches qui servent ce jalon</div>
          <ul className="list-disc list-inside text-slate-700">{tachesLiees.map((t: any) => <li key={t.id}>{t.libelle}</li>)}</ul>
        </div>
      )}
      {aval.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Chaîne aval — ce qu'un retard ici décale</div>
          <ol className="space-y-1">
            {aval.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-slate-700"><ArrowDownRight size={13} className="text-pass-orange" /> {a.libelle} <span className="text-xs text-slate-400">({formatDate(a.datePrevue)})</span></li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

const Info = ({ label, val }: { label: string; val: string }) => (
  <div><div className="text-xs text-slate-400 uppercase tracking-wide">{label}</div><div className="text-slate-700">{val}</div></div>
);
