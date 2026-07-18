import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderKanban, Search, ArrowUpDown } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { EtatBadge, RecoBadge } from "../components/Badges";
import { formatDateHeure } from "../lib/rules";
import type { Demande, EtatDemande } from "../lib/types";

type Tri = "recent" | "ancien" | "etat";

interface DemandeRow extends Demande {
  personne: { nom: string; prenoms: string; numero_cni: string } | null;
}

const FILTRES: { v: "all" | EtatDemande; l: string }[] = [
  { v: "all", l: "Tous" },
  { v: "brouillon", l: "Brouillons" },
  { v: "soumise", l: "Soumis" },
  { v: "a_instruire", l: "À instruire" },
  { v: "validee", l: "Validés" },
  { v: "refusee", l: "Refusés" },
];

const ORDRE_ETAT: Record<EtatDemande, number> = {
  a_instruire: 0,
  soumise: 1,
  brouillon: 2,
  validee: 3,
  refusee: 4,
};

export function Dossiers() {
  const { agent } = useAuth();
  const [rows, setRows] = useState<DemandeRow[]>([]);
  const [filtre, setFiltre] = useState<"all" | EtatDemande>("all");
  const [q, setQ] = useState("");
  const [mesDossiers, setMesDossiers] = useState(false);
  const [tri, setTri] = useState<Tri>("recent");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("demande")
      .select("*, personne(nom,prenoms,numero_cni)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as DemandeRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = rows
    .filter((r) => {
      if (filtre !== "all" && r.etat !== filtre) return false;
      if (mesDossiers && r.id_agent !== agent?.id_agent) return false;
      if (q.trim()) {
        const s = q.toLowerCase();
        return (
          r.numero_dossier.toLowerCase().includes(s) ||
          r.personne?.nom.toLowerCase().includes(s) ||
          r.personne?.prenoms.toLowerCase().includes(s) ||
          r.personne?.numero_cni.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (tri === "etat") return ORDRE_ETAT[a.etat] - ORDRE_ETAT[b.etat];
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return tri === "recent" ? db - da : da - db;
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-pass-blue-light text-pass-blue">
          <FolderKanban size={20} />
        </div>
        <h1 className="text-xl font-bold">Dossiers</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTRES.map((f) => (
            <button
              key={f.v}
              onClick={() => setFiltre(f.v)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                filtre === f.v ? "bg-pass-blue text-white" : "bg-white border border-slate-300 text-slate-600"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMesDossiers((v) => !v)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            mesDossiers ? "bg-pass-orange text-white" : "bg-white border border-slate-300 text-slate-600"
          }`}
        >
          Mes dossiers
        </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <ArrowUpDown size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              className="field-input !py-2 pl-8 pr-2 text-sm"
              value={tri}
              onChange={(e) => setTri(e.target.value as Tri)}
            >
              <option value="recent">Plus récents</option>
              <option value="ancien">Plus anciens</option>
              <option value="etat">Par état (priorité)</option>
            </select>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="field-input !py-2 pl-9 w-56"
              placeholder="Rechercher (nom, dossier, CNI)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-400 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-slate-400 text-sm">Aucun dossier.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Dossier</th>
                <th className="px-4 py-3 font-medium">Bénéficiaire</th>
                <th className="px-4 py-3 font-medium">État</th>
                <th className="px-4 py-3 font-medium">Recommandation</th>
                <th className="px-4 py-3 font-medium">Créé le</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id_demande} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/verification/${r.id_demande}`} className="font-mono text-pass-blue hover:underline">
                      {r.numero_dossier}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-700">
                      {r.personne ? `${r.personne.nom} ${r.personne.prenoms}` : "—"}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">{r.personne?.numero_cni}</div>
                  </td>
                  <td className="px-4 py-3">
                    <EtatBadge etat={r.etat} />
                  </td>
                  <td className="px-4 py-3">
                    <RecoBadge reco={r.recommandation} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDateHeure(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
