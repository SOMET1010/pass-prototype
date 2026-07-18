import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gavel, ArrowRight, InboxIcon } from "lucide-react";
import { supabase } from "../lib/supabase";
import { RecoBadge } from "../components/Badges";
import { formatDate, formatDateHeure } from "../lib/rules";
import type { Demande } from "../lib/types";

interface Row extends Demande {
  personne: { nom: string; prenoms: string; numero_cni: string; zone_residence: string } | null;
}

export function Instruction() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("demande")
      .select("*, personne(nom,prenoms,numero_cni,zone_residence)")
      .eq("etat", "a_instruire")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setRows((data as Row[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-pass-orange-light text-pass-orange">
          <Gavel size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold">File d'instruction</h1>
          <p className="text-sm text-slate-500">
            Dossiers en attente d'examen par un agent instructeur (données incohérentes, absence de ligne, cas
            particuliers).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
            <InboxIcon size={22} />
          </div>
          <p className="font-semibold text-slate-700">Aucun dossier à instruire</p>
          <p className="text-sm text-slate-500 mt-1">La file est vide : tous les dossiers ont été traités.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            {rows.length} dossier{rows.length > 1 ? "s" : ""} en attente.
          </p>
          {rows.map((r) => (
            <Link
              key={r.id_demande}
              to={`/verification/${r.id_demande}`}
              className="card p-4 flex items-center justify-between gap-4 hover:border-pass-blue transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 truncate">
                    {r.personne ? `${r.personne.nom} ${r.personne.prenoms}` : "—"}
                  </span>
                  <RecoBadge reco={r.recommandation} />
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  <span className="font-mono">{r.numero_dossier}</span> · CNI{" "}
                  <span className="font-mono">{r.personne?.numero_cni}</span> · {r.personne?.zone_residence} · déposé le{" "}
                  {formatDate(r.date_soumission ?? r.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="hidden sm:block text-xs text-slate-400">{formatDateHeure(r.created_at)}</span>
                <span className="btn-primary !py-2 !px-3">
                  Instruire <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
