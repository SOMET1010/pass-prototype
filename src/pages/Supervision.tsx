import { useEffect, useState } from "react";
import { Users, CheckCircle2, HelpCircle, XCircle, Gauge, ScrollText, Package, UserCog, Zap, Wrench, ShieldX } from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatDateHeure, LIBELLE_ROLE } from "../lib/rules";
import { CartographieDistribution } from "../components/CartographieDistribution";
import { coordZone } from "../lib/zones";
import { MapPin } from "lucide-react";
import type { Campagne, EtatDemande, JournalAudit, Agent } from "../lib/types";

interface Ligne {
  etat: EtatDemande;
  personne: { zone_residence: string } | null;
}

function debutDeJournee(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function debutSemaine(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 6);
  return d;
}

export function Supervision() {
  const [campagne, setCampagne] = useState<Campagne | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [journal, setJournal] = useState<JournalAudit[]>([]);
  const [stock, setStock] = useState(0);
  const [activiteAgents, setActiviteAgents] = useState<{ agent: Agent; enroles: number }[]>([]);
  const [serie7j, setSerie7j] = useState<{ label: string; n: number }[]>([]);
  const [remises, setRemises] = useState({ total: 0, actives: 0 });
  const [carte, setCarte] = useState<{ zone: string; distribues: number; stock: number }[]>([]);
  const [savStats, setSavStats] = useState({ ouverts: 0, horsService: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const debut = debutDeJournee();
      const { data: camp } = await supabase
        .from("campagne")
        .select("*")
        .eq("etat", "ouverte")
        .order("date_debut", { ascending: false })
        .limit(1)
        .maybeSingle();
      setCampagne(camp as Campagne);
      const semaine = debutSemaine();
      const [{ data: dem }, { data: jr }, { count: stk }, { data: agents }, { data: demJour }, { data: demSemaine }] =
        await Promise.all([
          camp
            ? supabase.from("demande").select("etat, personne(zone_residence)").eq("id_campagne", (camp as Campagne).id_campagne)
            : Promise.resolve({ data: [] as Ligne[] }),
          supabase.from("journal_audit").select("*").order("horodatage", { ascending: false }).limit(15),
          supabase.from("terminal").select("*", { count: "exact", head: true }).eq("statut", "en_stock"),
          supabase.from("agent").select("*").order("role"),
          supabase.from("demande").select("id_agent").gte("created_at", debut),
          supabase.from("demande").select("created_at").gte("created_at", semaine.toISOString()),
        ]);
      const { data: dists } = await supabase.from("distribution").select("statut_activation, demande(personne(zone_residence))");
      const distList = (dists as unknown as { statut_activation: string; demande: { personne: { zone_residence: string } | null } | null }[]) ?? [];
      setRemises({ total: distList.length, actives: distList.filter((d) => d.statut_activation === "active").length });
      // Cartographie : distribués + stock par zone
      const { data: stockPts } = await supabase.from("v_stock_points").select("zone, stock");
      const stockZone: Record<string, number> = {};
      for (const p of (stockPts as { zone: string; stock: number }[]) ?? [])
        stockZone[p.zone] = (stockZone[p.zone] ?? 0) + p.stock;
      const distZone: Record<string, number> = {};
      for (const d of distList) {
        const z = d.demande?.personne?.zone_residence;
        if (z) distZone[z] = (distZone[z] ?? 0) + 1;
      }
      const zones = Array.from(new Set([...Object.keys(stockZone), ...Object.keys(distZone)])).filter((z) => coordZone(z));
      setCarte(zones.map((z) => ({ zone: z, distribues: distZone[z] ?? 0, stock: stockZone[z] ?? 0 })));
      // SAV : tickets ouverts + terminaux hors service (perdu/bloqué)
      const [{ count: savOuv }, { count: hs }] = await Promise.all([
        supabase.from("sav_ticket").select("*", { count: "exact", head: true }).neq("statut", "resolu"),
        supabase.from("terminal").select("*", { count: "exact", head: true }).in("statut", ["perdu", "bloque"]),
      ]);
      setSavStats({ ouverts: savOuv ?? 0, horsService: hs ?? 0 });
      setLignes((dem as Ligne[]) ?? []);
      setJournal((jr as JournalAudit[]) ?? []);
      setStock(stk ?? 0);
      // Enrôlements du jour par agent
      const compte = new Map<string, number>();
      for (const d of (demJour as { id_agent: string | null }[]) ?? []) {
        if (d.id_agent) compte.set(d.id_agent, (compte.get(d.id_agent) ?? 0) + 1);
      }
      setActiviteAgents(
        ((agents as Agent[]) ?? [])
          .filter((a) => a.role === "enrolement" || (compte.get(a.id_agent) ?? 0) > 0)
          .map((a) => ({ agent: a, enroles: compte.get(a.id_agent) ?? 0 })),
      );
      // Série des 7 derniers jours (enrôlements par jour)
      const jours: { label: string; n: number }[] = [];
      const clefs: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        clefs.push(d.toDateString());
        jours.push({ label: d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" }), n: 0 });
      }
      for (const d of (demSemaine as { created_at: string }[]) ?? []) {
        const k = new Date(d.created_at);
        k.setHours(0, 0, 0, 0);
        const idx = clefs.indexOf(k.toDateString());
        if (idx >= 0) jours[idx].n += 1;
      }
      setSerie7j(jours);
      setLoading(false);
    })();
  }, []);

  const total = lignes.length;
  const valides = lignes.filter((l) => l.etat === "validee").length;
  const instruction = lignes.filter((l) => l.etat === "a_instruire").length;
  const refuses = lignes.filter((l) => l.etat === "refusee").length;

  const parZone = new Map<string, number>();
  for (const z of campagne?.zones_couvertes ?? []) parZone.set(z, 0);
  for (const l of lignes) {
    if (l.etat === "validee" && l.personne?.zone_residence) {
      parZone.set(l.personne.zone_residence, (parZone.get(l.personne.zone_residence) ?? 0) + 1);
    }
  }
  const quota = campagne?.quota_total ?? 0;

  if (loading) return <div className="text-slate-400">Chargement…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Supervision</h1>
        <p className="text-sm text-slate-500">
          {campagne ? (
            <>
              Campagne <strong>{campagne.libelle}</strong> · quota {quota} · {campagne.zones_couvertes.length} zones
            </>
          ) : (
            "Aucune campagne ouverte"
          )}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users size={18} />} label="Enrôlés" value={total} tone="blue" />
        <Kpi icon={<CheckCircle2 size={18} />} label="Validés" value={valides} tone="green" />
        <Kpi icon={<HelpCircle size={18} />} label="En instruction" value={instruction} tone="orange" />
        <Kpi icon={<XCircle size={18} />} label="Refusés" value={refuses} tone="red" />
        <Kpi icon={<Zap size={18} />} label={`Activés / ${remises.total}`} value={remises.actives} tone="green" />
        <Kpi icon={<Package size={18} />} label="En stock" value={stock} tone="slate" />
        <Kpi icon={<Wrench size={18} />} label="SAV ouverts" value={savStats.ouverts} tone="orange" />
        <Kpi icon={<ShieldX size={18} />} label="Hors service" value={savStats.horsService} tone="red" />
      </div>

      {/* Avancement quota global */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gauge size={18} className="text-pass-blue" />
          <h2 className="text-base font-semibold">Avancement du quota</h2>
        </div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-500">Attributions validées</span>
          <span className="font-semibold">
            {valides} / {quota}
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-pass-blue rounded-full transition-all"
            style={{ width: `${quota ? Math.min(100, (valides / quota) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Avancement par zone */}
      <div className="card p-5">
        <h2 className="text-base font-semibold mb-4">Avancement par zone</h2>
        <div className="space-y-3">
          {[...parZone.entries()].map(([zone, n]) => (
            <div key={zone}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">{zone}</span>
                <span className="text-slate-400">{n} validé{n > 1 ? "s" : ""}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-pass-orange rounded-full"
                  style={{ width: `${quota ? Math.min(100, (n / quota) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
          {parZone.size === 0 && <p className="text-sm text-slate-400">Aucune zone couverte.</p>}
        </div>
      </div>

      {/* Cartographie de la distribution */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={18} className="text-pass-blue" />
          <h2 className="text-base font-semibold">Cartographie de la distribution</h2>
        </div>
        <CartographieDistribution data={carte} />
      </div>

      {/* Courbe des enrôlements (7 derniers jours) */}
      <div className="card p-5">
        <h2 className="text-base font-semibold mb-4">Enrôlements des 7 derniers jours</h2>
        {(() => {
          const maxN = Math.max(1, ...serie7j.map((j) => j.n));
          const total = serie7j.reduce((s, j) => s + j.n, 0);
          return (
            <>
              <div className="flex items-end justify-between gap-2 h-36">
                {serie7j.map((j, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1 h-full">
                    <span className="text-xs font-semibold text-slate-500">{j.n > 0 ? j.n : ""}</span>
                    <div
                      className="w-full max-w-[42px] rounded-t bg-pass-blue transition-all"
                      style={{ height: `${Math.max(4, (j.n / maxN) * 100)}%`, opacity: j.n === 0 ? 0.15 : 1 }}
                      title={`${j.label} : ${j.n}`}
                    />
                    <span className="text-[11px] text-slate-400 capitalize whitespace-nowrap">{j.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">Total sur la période : {total} enrôlement{total > 1 ? "s" : ""}.</p>
            </>
          );
        })()}
      </div>

      {/* Enrôlements du jour par agent */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserCog size={18} className="text-pass-blue" />
          <h2 className="text-base font-semibold">Enrôlements du jour par agent</h2>
          <span className="ml-auto text-xs text-slate-400">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-200">
                <th className="py-2 pr-4 font-medium">Agent</th>
                <th className="py-2 pr-4 font-medium">Rôle</th>
                <th className="py-2 font-medium text-right">Enrôlements aujourd'hui</th>
              </tr>
            </thead>
            <tbody>
              {activiteAgents.map(({ agent, enroles }) => (
                <tr key={agent.id_agent} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-slate-700">{agent.identite.split(" (")[0]}</td>
                  <td className="py-2.5 pr-4 text-slate-500">{LIBELLE_ROLE[agent.role]}</td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`inline-block min-w-8 rounded-full px-2.5 py-0.5 text-sm font-bold ${
                        enroles > 0 ? "bg-pass-blue-light text-pass-blue" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {enroles}
                    </span>
                  </td>
                </tr>
              ))}
              {activiteAgents.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-sm text-slate-400">
                    Aucun enrôlement enregistré aujourd'hui.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Journal d'audit */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText size={18} className="text-pass-blue" />
          <h2 className="text-base font-semibold">Journal d'audit — dernières opérations</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {journal.map((e) => (
            <li key={e.id_evenement} className="py-2.5 flex items-start justify-between gap-3">
              <div>
                <span className="text-sm text-slate-700">{e.action}</span>
                {e.cible_id && <span className="ml-2 text-xs text-slate-400 font-mono">{e.cible_id}</span>}
                <div className="text-xs text-slate-400">par {e.acteur}</div>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{formatDateHeure(e.horodatage)}</span>
            </li>
          ))}
          {journal.length === 0 && <li className="py-2 text-sm text-slate-400">Journal vide.</li>}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Journal inaltérable : les entrées ne peuvent être ni modifiées ni supprimées (RM-151).
        </p>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "blue" | "green" | "orange" | "red" | "slate";
}) {
  const tones: Record<string, string> = {
    blue: "bg-pass-blue-light text-pass-blue",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-pass-orange-light text-pass-orange",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-500",
  };
  return (
    <div className="card p-4">
      <div className={`grid h-9 w-9 place-items-center rounded-lg mb-2 ${tones[tone]}`}>{icon}</div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
