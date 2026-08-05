import { Link } from "react-router-dom";
import { AlertTriangle, Gavel, Flag, CalendarClock, TrendingUp, ArrowRight } from "lucide-react";
import { useStore } from "../store/store";
import {
  alertes, sante, avancementGlobal, avancementChantier, decisionsBloquantes,
  tachesImminentes, tachesEnRetard, jalonsMenaces,
} from "../lib/roadmap";
import { formatDate, libelleEcheance } from "../lib/dates";
import { EnTete, Avancement } from "../components/ui";

const SANTE = {
  rouge: "bg-red-50 border-red-200 text-red-800",
  orange: "bg-amber-50 border-amber-200 text-amber-800",
  vert: "bg-emerald-50 border-emerald-200 text-emerald-800",
};

export default function TableauDeBord() {
  const { data, dateRef } = useStore();
  const s = sante(data, dateRef);
  const listeAlertes = alertes(data, dateRef);
  const global = avancementGlobal(data);
  const imminentes = tachesImminentes(data, dateRef, 10);
  const retard = tachesEnRetard(data, dateRef);
  const bloquantes = decisionsBloquantes(data);
  const menaces = jalonsMenaces(data, dateRef);
  const prochainsJalons = [...data.jalons].filter((j) => j.statut !== "atteint").sort((a, b) => a.datePrevue.localeCompare(b.datePrevue)).slice(0, 4);

  return (
    <div>
      <EnTete titre="Tableau de bord" sous="Ce qui bloque, ce qui vient, ce qui est en retard — mis à jour à la date de référence." />

      <div className={`card border p-4 mb-6 ${SANTE[s.niveau]}`}>
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${s.niveau === "rouge" ? "bg-red-500" : s.niveau === "orange" ? "bg-amber-500" : "bg-emerald-500"}`} />
          <span className="font-semibold">Santé du programme : {s.libelle}</span>
        </div>
      </div>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Gavel} label="Décisions bloquantes" valeur={bloquantes.length} accent={bloquantes.length ? "text-red-600" : "text-emerald-600"} to="/decisions" />
        <Kpi icon={Flag} label="Jalons menacés" valeur={menaces.length} accent={menaces.length ? "text-red-600" : "text-emerald-600"} to="/jalons" />
        <Kpi icon={AlertTriangle} label="Tâches en retard" valeur={retard.length} accent={retard.length ? "text-amber-600" : "text-emerald-600"} to="/taches" />
        <Kpi icon={TrendingUp} label="Avancement global" valeur={`${global}%`} accent="text-pass-blue" to="/chantiers" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Alertes */}
        <section className="lg:col-span-2 card p-5">
          <h2 className="font-bold mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-pass-orange" /> Alertes prioritaires</h2>
          {listeAlertes.length === 0 && <p className="text-sm text-slate-400">Aucune alerte à la date de référence.</p>}
          <ul className="space-y-2">
            {listeAlertes.map((a, i) => (
              <li key={i}>
                <Link to={a.lien ?? "#"} className="flex gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.niveau === "critique" ? "bg-red-500" : a.niveau === "attention" ? "bg-amber-500" : "bg-slate-300"}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800">{a.titre}</span>
                    <span className="block text-xs text-slate-500">{a.detail}</span>
                  </span>
                  <ArrowRight size={15} className="ml-auto self-center text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Prochains jalons */}
        <section className="card p-5">
          <h2 className="font-bold mb-3 flex items-center gap-2"><Flag size={18} className="text-pass-blue" /> Prochains jalons</h2>
          <ul className="space-y-3">
            {prochainsJalons.map((j) => (
              <li key={j.id} className="text-sm">
                <div className="font-medium text-slate-800 leading-snug">{j.libelle}</div>
                <div className="text-xs text-slate-500">{formatDate(j.datePrevue)} · <span className="text-pass-orange">{libelleEcheance(j.datePrevue, dateRef)}</span></div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Cette semaine + avancement chantiers */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <section className="card p-5">
          <h2 className="font-bold mb-3 flex items-center gap-2"><CalendarClock size={18} className="text-pass-blue" /> À traiter sous 10 jours</h2>
          {imminentes.length === 0 && <p className="text-sm text-slate-400">Rien d'imminent.</p>}
          <ul className="divide-y divide-slate-100">
            {imminentes.slice(0, 8).map((t) => (
              <li key={t.id} className="py-2 flex items-center gap-3 text-sm">
                <span className="flex-1 min-w-0 truncate">{t.libelle}</span>
                <span className="text-xs text-slate-400">{t.responsable}</span>
                <span className="text-xs font-medium text-pass-orange w-20 text-right">{libelleEcheance(t.echeance, dateRef)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="font-bold mb-3 flex items-center gap-2"><TrendingUp size={18} className="text-pass-blue" /> Avancement par chantier</h2>
          <ul className="space-y-2.5">
            {[...data.chantiers].sort((a, b) => a.ordre - b.ordre).map((c) => (
              <li key={c.id} className="flex items-center gap-3 text-sm">
                <Link to={`/chantiers?c=${c.id}`} className="flex-1 min-w-0 truncate hover:text-pass-blue">{c.libelle}</Link>
                <Avancement valeur={avancementChantier(c.id, data)} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, valeur, accent, to }: { icon: any; label: string; valeur: string | number; accent: string; to: string }) {
  return (
    <Link to={to} className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 text-slate-400"><Icon size={16} /><span className="text-xs">{label}</span></div>
      <div className={`text-3xl font-bold mt-1 ${accent}`}>{valeur}</div>
    </Link>
  );
}
