import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutList, Columns, Bell, Copy, Check, AlertTriangle } from "lucide-react";
import { useStore } from "../store/store";
import { useAuth } from "../auth/AuthContext";
import type { Tache, StatutTache } from "../types";
import { EnTete, BadgeTache, BadgePriorite, Avancement, Modale, Vide } from "../components/ui";
import { formatDate, libelleEcheance, estEnRetard } from "../lib/dates";
import { dependancesNonSatisfaites } from "../lib/roadmap";
import { brouillonRelanceTache, texteBrouillon } from "../lib/notifications";

const COLONNES: { id: StatutTache; label: string }[] = [
  { id: "a_faire", label: "À faire" },
  { id: "en_cours", label: "En cours" },
  { id: "bloque", label: "Bloqué" },
  { id: "fait", label: "Fait" },
];

export default function Taches() {
  const { data, dateRef } = useStore();
  const [params, setParams] = useSearchParams();
  const [vue, setVue] = useState<"liste" | "kanban">("liste");
  const [sel, setSel] = useState<Tache | null>(null);

  const fChantier = params.get("c") ?? "";
  const fResp = params.get("r") ?? "";
  const fStatut = params.get("s") ?? "";
  const setF = (k: string, v: string) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p); };

  const liste = useMemo(() => data.taches.filter((t) =>
    (!fChantier || t.chantierId === fChantier) &&
    (!fResp || t.responsable === fResp) &&
    (!fStatut || t.statut === fStatut)
  ).sort((a, b) => a.echeance.localeCompare(b.echeance)), [data.taches, fChantier, fResp, fStatut]);

  const chantier = (id: string) => data.chantiers.find((c) => c.id === id);

  return (
    <div>
      <EnTete titre="Tâches & activités"
        sous="Les activités de la feuille de route, avec responsable, échéance, dépendances et diligence."
        action={
          <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5">
            <button onClick={() => setVue("liste")} className={`btn btn-sm ${vue === "liste" ? "bg-pass-blue text-white" : "text-slate-500"}`}><LayoutList size={15} /> Liste</button>
            <button onClick={() => setVue("kanban")} className={`btn btn-sm ${vue === "kanban" ? "bg-pass-blue text-white" : "text-slate-500"}`}><Columns size={15} /> Kanban</button>
          </div>
        } />

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select className="field-input w-auto" value={fChantier} onChange={(e) => setF("c", e.target.value)}>
          <option value="">Tous les chantiers</option>
          {data.chantiers.map((c) => <option key={c.id} value={c.id}>{c.libelle}</option>)}
        </select>
        <select className="field-input w-auto" value={fResp} onChange={(e) => setF("r", e.target.value)}>
          <option value="">Tous les responsables</option>
          {[...new Set(data.taches.map((t) => t.responsable))].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {vue === "liste" && (
          <select className="field-input w-auto" value={fStatut} onChange={(e) => setF("s", e.target.value)}>
            <option value="">Tous les statuts</option>
            {COLONNES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        )}
        <span className="ml-auto self-center text-xs text-slate-400">{liste.length} tâche(s)</span>
      </div>

      {vue === "liste" ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-4 py-3">Activité</th>
                <th className="text-left font-medium px-4 py-3">Responsable</th>
                <th className="text-left font-medium px-4 py-3">Échéance</th>
                <th className="text-left font-medium px-4 py-3">Avancement</th>
                <th className="text-left font-medium px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {liste.map((t) => {
                const retard = estEnRetard(t.echeance, dateRef) && t.statut !== "fait";
                return (
                  <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSel(t)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <BadgePriorite p={t.priorite} />
                        <span className="font-medium text-slate-800">{t.libelle}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{chantier(t.chantierId)?.libelle} · livrable : {t.livrable}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{t.responsable}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>{formatDate(t.echeance)}</div>
                      <div className={`text-xs ${retard ? "text-red-600 font-medium" : "text-slate-400"}`}>{libelleEcheance(t.echeance, dateRef)}</div>
                    </td>
                    <td className="px-4 py-3"><Avancement valeur={t.statut === "fait" ? 100 : t.avancement} /></td>
                    <td className="px-4 py-3"><BadgeTache s={t.statut} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {liste.length === 0 && <Vide>Aucune tâche pour ces filtres.</Vide>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {COLONNES.map((col) => {
            const items = liste.filter((t) => t.statut === col.id);
            return (
              <div key={col.id} className="bg-slate-100/70 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-sm font-semibold text-slate-600">{col.label}</span>
                  <span className="text-xs text-slate-400">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((t) => {
                    const retard = estEnRetard(t.echeance, dateRef) && t.statut !== "fait";
                    return (
                      <button key={t.id} onClick={() => setSel(t)} className="card w-full text-left p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-1.5 mb-1"><BadgePriorite p={t.priorite} /></div>
                        <div className="text-sm font-medium text-slate-800 leading-snug">{t.libelle}</div>
                        <div className="text-xs text-slate-400 mt-1">{t.responsable}</div>
                        <div className={`text-xs mt-0.5 ${retard ? "text-red-600" : "text-slate-400"}`}>{formatDate(t.echeance)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sel && <Modale titre="Activité" onClose={() => setSel(null)} large><DetailTache t={sel} onClose={() => setSel(null)} /></Modale>}
    </div>
  );
}

function DetailTache({ t, onClose }: { t: Tache; onClose: () => void }) {
  const { data, dateRef, updateTache, ajouterRelance } = useStore();
  const { peutEcrire } = useAuth();
  const [statut, setStatut] = useState<StatutTache>(t.statut);
  const [avancement, setAvancement] = useState(t.avancement);
  const [assigneA, setAssigneA] = useState(t.assigneA ?? "");
  const [note, setNote] = useState(t.note ?? "");
  const [copie, setCopie] = useState(false);
  const [relance, setRelance] = useState(false);

  const chantier = data.chantiers.find((c) => c.id === t.chantierId);
  const nonSatisfaites = dependancesNonSatisfaites(t, data);
  const jalon = data.jalons.find((j) => j.id === t.jalonId);
  const brouillon = brouillonRelanceTache(t, data.membres);

  const enregistrer = () => {
    updateTache(t.id, { statut, avancement: statut === "fait" ? 100 : avancement, assigneA: assigneA || undefined, note });
    onClose();
  };
  const diligenter = () => {
    ajouterRelance(t.id, { date: dateRef, auteur: "Chef de programme", message: `Relance envoyée — échéance ${formatDate(t.echeance)}` });
    setRelance(true);
  };

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <BadgePriorite p={t.priorite} />
          <h3 className="font-semibold text-base">{t.libelle}</h3>
        </div>
        <p className="text-xs text-slate-500 mt-1">{chantier?.libelle} · Responsable : {t.responsable} · Livrable : {t.livrable}</p>
      </div>

      {nonSatisfaites.length > 0 && (
        <div className="rounded-lg bg-amber-50 text-amber-800 p-3 text-xs flex items-start gap-1.5">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>En attente de : {nonSatisfaites.map((d) => d.libelle).join(" · ")}</span>
        </div>
      )}
      {jalon && <div className="text-xs text-slate-500">Sert le jalon : <strong>{jalon.libelle}</strong></div>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Statut</label>
          <select className="field-input" value={statut} disabled={!peutEcrire} onChange={(e) => setStatut(e.target.value as StatutTache)}>
            {COLONNES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Assigné à</label>
          <select className="field-input" value={assigneA} disabled={!peutEcrire} onChange={(e) => setAssigneA(e.target.value)}>
            <option value="">— non assigné —</option>
            {data.membres.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="field-label">Avancement : {statut === "fait" ? 100 : avancement}%</label>
        <input type="range" min={0} max={100} step={5} value={statut === "fait" ? 100 : avancement} disabled={!peutEcrire || statut === "fait"}
          onChange={(e) => setAvancement(Number(e.target.value))} className="w-full accent-pass-blue" />
      </div>

      <div>
        <label className="field-label">Note</label>
        <textarea className="field-input min-h-[60px]" value={note} disabled={!peutEcrire} onChange={(e) => setNote(e.target.value)} placeholder="Point de situation, blocage…" />
      </div>

      {/* Diligence / relance */}
      <div className="rounded-lg border border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-700 flex items-center gap-1.5"><Bell size={14} className="text-pass-orange" /> Diligenter</span>
          {peutEcrire && <button className="btn-ghost btn-sm" onClick={diligenter}><Bell size={13} /> Relancer le responsable</button>}
        </div>
        {relance && <p className="text-xs text-emerald-600 mt-2">Relance enregistrée dans l'historique de la tâche.</p>}
        {t.relances.length > 0 && (
          <ul className="mt-2 text-xs text-slate-500 space-y-1">
            {t.relances.map((r, i) => <li key={i}>• {formatDate(r.date)} — {r.message}</li>)}
          </ul>
        )}
        <details className="mt-3">
          <summary className="text-xs text-pass-blue cursor-pointer">Voir le brouillon de relance</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-600">{texteBrouillon(brouillon)}</pre>
          <button className="btn-ghost btn-sm mt-2" onClick={() => { navigator.clipboard?.writeText(texteBrouillon(brouillon)); setCopie(true); }}>
            {copie ? <><Check size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
          </button>
        </details>
      </div>

      {peutEcrire && (
        <div className="flex justify-end gap-2">
          <button className="btn-primary" onClick={enregistrer}>Enregistrer</button>
        </div>
      )}
    </div>
  );
}
