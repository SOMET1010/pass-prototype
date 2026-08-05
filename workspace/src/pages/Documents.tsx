import { useState } from "react";
import { FileText, Plus, ExternalLink, Lock, Trash2 } from "lucide-react";
import { useStore } from "../store/store";
import { useAuth } from "../auth/AuthContext";
import type { Document, StatutDoc, Fonction } from "../types";
import { EnTete, Chip, Modale, Vide } from "../components/ui";
import { formatDate } from "../lib/dates";

const STATUT: Record<StatutDoc, [string, string]> = {
  projet: ["bg-amber-100 text-amber-700", "Projet"],
  valide: ["bg-emerald-100 text-emerald-700", "Validé"],
  obsolete: ["bg-slate-100 text-slate-500", "Obsolète"],
};

const FONCTIONS: Fonction[] = ["Coordination", "Marchés", "Juridique", "Données", "Plateforme", "Partenaires", "Logistique", "Budget", "Communication", "Direction Générale"];

export default function Documents() {
  const { data, ajouterDocument, supprimerDocument } = useStore();
  const { peutEcrire, voitConfidentiel } = useAuth();
  const [ajout, setAjout] = useState(false);

  const liste = data.documents.filter((d) => voitConfidentiel || !d.confidentiel);
  const chantier = (id?: string) => data.chantiers.find((c) => c.id === id)?.libelle;

  return (
    <div>
      <EnTete titre="Référentiel documentaire"
        sous="Documents du programme, versionnés. Les documents confidentiels ne sont pas visibles des observateurs."
        action={peutEcrire && <button className="btn-primary" onClick={() => setAjout(true)}><Plus size={16} /> Ajouter</button>} />

      {liste.length === 0 ? (
        <Vide>Aucun document référencé pour l'instant. Ajoutez les pièces du programme (dossier de consultation, conventions, comptes rendus…).</Vide>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-4 py-3">Titre</th>
                <th className="text-left font-medium px-4 py-3">Version</th>
                <th className="text-left font-medium px-4 py-3">Statut</th>
                <th className="text-left font-medium px-4 py-3">Auteur</th>
                <th className="text-left font-medium px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {liste.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium text-slate-800">
                      <FileText size={15} className="text-slate-400" />
                      {d.titre}
                      {d.confidentiel && <Lock size={13} className="text-red-500" />}
                    </div>
                    {chantier(d.chantierId) && <div className="text-xs text-slate-400 mt-0.5 ml-6">{chantier(d.chantierId)}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.version}</td>
                  <td className="px-4 py-3"><Chip color={STATUT[d.statut][0]}>{STATUT[d.statut][1]}</Chip></td>
                  <td className="px-4 py-3 text-slate-600">{d.auteur}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(d.date)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {d.lien && <a href={d.lien} target="_blank" rel="noreferrer" className="text-pass-blue inline-flex items-center gap-1 text-xs mr-3"><ExternalLink size={13} /> Ouvrir</a>}
                    {peutEcrire && <button onClick={() => supprimerDocument(d.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ajout && <Modale titre="Ajouter un document" onClose={() => setAjout(false)}>
        <FormDoc chantiers={data.chantiers} onSave={(doc) => { ajouterDocument(doc); setAjout(false); }} />
      </Modale>}
    </div>
  );
}

function FormDoc({ chantiers, onSave }: { chantiers: any[]; onSave: (d: Document) => void }) {
  const [titre, setTitre] = useState("");
  const [version, setVersion] = useState("v1");
  const [statut, setStatut] = useState<StatutDoc>("projet");
  const [auteur, setAuteur] = useState<Fonction>("Coordination");
  const [lien, setLien] = useState("");
  const [chantierId, setChantierId] = useState("");
  const [confidentiel, setConfidentiel] = useState(false);

  return (
    <div className="space-y-3 text-sm">
      <div><label className="field-label">Titre</label><input className="field-input" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Dossier de consultation, convention…" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="field-label">Version</label><input className="field-input" value={version} onChange={(e) => setVersion(e.target.value)} /></div>
        <div><label className="field-label">Statut</label>
          <select className="field-input" value={statut} onChange={(e) => setStatut(e.target.value as StatutDoc)}>
            {Object.entries(STATUT).map(([k, v]) => <option key={k} value={k}>{v[1]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="field-label">Auteur</label>
          <select className="field-input" value={auteur} onChange={(e) => setAuteur(e.target.value as Fonction)}>
            {FONCTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div><label className="field-label">Chantier</label>
          <select className="field-input" value={chantierId} onChange={(e) => setChantierId(e.target.value)}>
            <option value="">—</option>
            {chantiers.map((c) => <option key={c.id} value={c.id}>{c.libelle}</option>)}
          </select>
        </div>
      </div>
      <div><label className="field-label">Lien (espace documentaire existant)</label><input className="field-input" value={lien} onChange={(e) => setLien(e.target.value)} placeholder="https://…" /></div>
      <label className="flex items-center gap-2 text-slate-700"><input type="checkbox" checked={confidentiel} onChange={(e) => setConfidentiel(e.target.checked)} /> Document confidentiel (masqué aux observateurs)</label>
      <div className="flex justify-end">
        <button className="btn-primary" disabled={!titre.trim()}
          onClick={() => onSave({ id: `doc-${Date.now()}`, titre: titre.trim(), version, statut, auteur, date: new Date().toISOString().slice(0, 10), confidentiel, lien: lien || undefined, chantierId: chantierId || undefined })}>
          Ajouter
        </button>
      </div>
    </div>
  );
}
