import { Link } from "react-router-dom";
import { FolderKanban, User, ArrowRight } from "lucide-react";
import { useStore } from "../store/store";
import { EnTete, Avancement } from "../components/ui";
import { avancementChantier, tachesEnRetard, estOuverte } from "../lib/roadmap";

export default function Chantiers() {
  const { data, dateRef } = useStore();
  const retardIds = new Set(tachesEnRetard(data, dateRef).map((t) => t.id));

  return (
    <div>
      <EnTete titre="Chantiers" sous="Huit chantiers, chacun avec un référent désigné, plus la coordination transverse. L'avancement agrège l'état des tâches." />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...data.chantiers].sort((a, b) => a.ordre - b.ordre).map((c) => {
          const taches = data.taches.filter((t) => t.chantierId === c.id);
          const ouvertes = taches.filter(estOuverte).length;
          const retard = taches.filter((t) => retardIds.has(t.id)).length;
          return (
            <Link key={c.id} to={`/taches?c=${c.id}`} className="card p-5 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="chip bg-pass-blue-light text-pass-blue-dark">{c.code}</span>
                  {c.transverse && <span className="chip bg-slate-100 text-slate-500 text-[10px]">Transverse</span>}
                </div>
                <FolderKanban size={18} className="text-slate-300" />
              </div>
              <h2 className="font-bold text-slate-800 mt-2">{c.libelle}</h2>
              <p className="text-xs text-slate-500 mt-1 flex-1">{c.perimetre}</p>

              <div className="text-xs text-slate-500 mt-3 flex items-center gap-1.5"><User size={13} /> Référent : {c.referent} · {c.chargePrincipale}</div>

              <div className="mt-3"><Avancement valeur={avancementChantier(c.id, data)} /></div>

              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="text-slate-500">{ouvertes} ouverte(s)</span>
                {retard > 0 && <span className="chip bg-red-100 text-red-700">{retard} en retard</span>}
                <span className="ml-auto text-pass-blue flex items-center gap-1">Voir les tâches <ArrowRight size={13} /></span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
