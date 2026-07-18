import { useEffect, useState } from "react";
import { Users, CheckCircle2, HelpCircle, XCircle, Gauge, ScrollText, Package } from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatDateHeure } from "../lib/rules";
import type { Campagne, EtatDemande, JournalAudit } from "../lib/types";

interface Ligne {
  etat: EtatDemande;
  personne: { zone_residence: string } | null;
}

export function Supervision() {
  const [campagne, setCampagne] = useState<Campagne | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [journal, setJournal] = useState<JournalAudit[]>([]);
  const [stock, setStock] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: camp } = await supabase
        .from("campagne")
        .select("*")
        .eq("etat", "ouverte")
        .order("date_debut", { ascending: false })
        .limit(1)
        .maybeSingle();
      setCampagne(camp as Campagne);
      const [{ data: dem }, { data: jr }, { count: stk }] = await Promise.all([
        camp
          ? supabase.from("demande").select("etat, personne(zone_residence)").eq("id_campagne", (camp as Campagne).id_campagne)
          : Promise.resolve({ data: [] as Ligne[] }),
        supabase.from("journal_audit").select("*").order("horodatage", { ascending: false }).limit(15),
        supabase.from("terminal").select("*", { count: "exact", head: true }).eq("statut", "en_stock"),
      ]);
      setLignes((dem as Ligne[]) ?? []);
      setJournal((jr as JournalAudit[]) ?? []);
      setStock(stk ?? 0);
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
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Kpi icon={<Users size={18} />} label="Enrôlés" value={total} tone="blue" />
        <Kpi icon={<CheckCircle2 size={18} />} label="Validés" value={valides} tone="green" />
        <Kpi icon={<HelpCircle size={18} />} label="En instruction" value={instruction} tone="orange" />
        <Kpi icon={<XCircle size={18} />} label="Refusés" value={refuses} tone="red" />
        <Kpi icon={<Package size={18} />} label="Terminaux en stock" value={stock} tone="slate" />
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
