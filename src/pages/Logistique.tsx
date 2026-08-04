import { useCallback, useEffect, useRef, useState } from "react";
import {
  Truck, PackageCheck, Warehouse, MapPin, ClipboardList, Boxes, ScanLine,
  Plus, Loader2, ArrowRightLeft, Users, Play, CheckCircle2, Building2, X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "../components/Toaster";
import { SimuleBadge } from "../components/Badges";
import { useAuth } from "../context/AuthContext";
import { formatDateHeure } from "../lib/rules";
import * as L from "../lib/logistique";
import type {
  Agent, Arrivage, Colis, Emplacement, Entrepot, Fournisseur, Mission,
  MouvementStock, PointRetrait, StockLogistique,
} from "../lib/types";

type Onglet = "bord" | "arrivages" | "reception" | "points" | "missions";

const ONGLETS: { id: Onglet; label: string; icon: typeof Truck }[] = [
  { id: "bord", label: "Tableau de bord", icon: Boxes },
  { id: "arrivages", label: "Arrivages & colisage", icon: ClipboardList },
  { id: "reception", label: "Réception & entrepôt", icon: PackageCheck },
  { id: "points", label: "Points mobiles & équipes", icon: MapPin },
  { id: "missions", label: "Missions & rapports", icon: Truck },
];

export function Logistique() {
  const { agent } = useAuth();
  const superviseur = agent?.role === "superviseur";
  const [onglet, setOnglet] = useState<Onglet>("bord");

  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [arrivages, setArrivages] = useState<Arrivage[]>([]);
  const [colis, setColis] = useState<Colis[]>([]);
  const [entrepots, setEntrepots] = useState<Entrepot[]>([]);
  const [emplacements, setEmplacements] = useState<Emplacement[]>([]);
  const [points, setPoints] = useState<PointRetrait[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [mouvements, setMouvements] = useState<MouvementStock[]>([]);
  const [stock, setStock] = useState<StockLogistique[]>([]);
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    const [f, a, c, e, em, p, ag, mi, mv, st] = await Promise.all([
      supabase.from("fournisseur").select("*").order("raison_sociale"),
      supabase.from("arrivage").select("*").order("created_at", { ascending: false }),
      supabase.from("colis").select("*").order("code_barre"),
      supabase.from("entrepot").select("*").order("libelle"),
      supabase.from("emplacement").select("*").order("code"),
      supabase.from("point_retrait").select("*").order("libelle"),
      supabase.from("agent").select("*").eq("statut", "actif").order("identite"),
      supabase.from("mission").select("*").order("created_at", { ascending: false }),
      supabase.from("mouvement_stock").select("*").order("horodatage", { ascending: false }).limit(12),
      supabase.from("v_stock_logistique").select("*"),
    ]);
    setFournisseurs((f.data as Fournisseur[]) ?? []);
    setArrivages((a.data as Arrivage[]) ?? []);
    setColis((c.data as Colis[]) ?? []);
    setEntrepots((e.data as Entrepot[]) ?? []);
    setEmplacements((em.data as Emplacement[]) ?? []);
    setPoints((p.data as PointRetrait[]) ?? []);
    setAgents((ag.data as Agent[]) ?? []);
    setMissions((mi.data as Mission[]) ?? []);
    setMouvements((mv.data as MouvementStock[]) ?? []);
    setStock((st.data as StockLogistique[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { charger(); }, [charger]);

  if (loading) return <div className="text-slate-400">Chargement…</div>;

  const ctx = {
    superviseur, charger, fournisseurs, arrivages, colis, entrepots, emplacements,
    points, agents, missions, mouvements, stock,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Truck className="text-pass-blue" size={22} /> Logistique — chaîne d'approvisionnement
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Du fournisseur au point PASS : colisage, réception, entrepôt, transfert, points mobiles, missions.
          </p>
        </div>
        {!superviseur && (
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5">
            Lecture seule — les actions logistiques sont réservées au rôle superviseur.
          </span>
        )}
      </div>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={`flex items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              onglet === o.id ? "border-pass-blue text-pass-blue" : "border-transparent text-slate-500 hover:text-pass-blue"
            }`}
          >
            <o.icon size={16} /> {o.label}
          </button>
        ))}
      </div>

      {onglet === "bord" && <TabBord {...ctx} />}
      {onglet === "arrivages" && <TabArrivages {...ctx} />}
      {onglet === "reception" && <TabReception {...ctx} />}
      {onglet === "points" && <TabPoints {...ctx} />}
      {onglet === "missions" && <TabMissions {...ctx} />}
    </div>
  );
}

type Ctx = {
  superviseur: boolean; charger: () => Promise<void>;
  fournisseurs: Fournisseur[]; arrivages: Arrivage[]; colis: Colis[];
  entrepots: Entrepot[]; emplacements: Emplacement[]; points: PointRetrait[];
  agents: Agent[]; missions: Mission[]; mouvements: MouvementStock[]; stock: StockLogistique[];
};

// ---------- Petits éléments ----------
function Kpi({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ? "text-pass-orange" : "text-pass-blue-dark"}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pass-blue/30";
function StatutPill({ children, tone }: { children: React.ReactNode; tone: "gris" | "bleu" | "vert" | "orange" | "rouge" }) {
  const map = {
    gris: "bg-slate-100 text-slate-600 border-slate-300", bleu: "bg-blue-50 text-blue-700 border-blue-300",
    vert: "bg-emerald-50 text-emerald-700 border-emerald-300", orange: "bg-orange-50 text-orange-700 border-orange-300",
    rouge: "bg-red-50 text-red-700 border-red-300",
  } as const;
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${map[tone]}`}>{children}</span>;
}

// ============================ TABLEAU DE BORD ============================
function TabBord({ colis, stock, mouvements, points }: Ctx) {
  const attendus = colis.filter((c) => c.statut === "attendu").length;
  const recus = colis.filter((c) => c.statut === "recu" || c.statut === "range").length;
  const ecarts = colis.filter((c) => c.statut === "ecart").length;
  const stockEntrepot = stock.filter((s) => s.niveau === "entrepot").reduce((n, s) => n + s.en_stock, 0);
  const stockPoints = stock.filter((s) => s.niveau === "point").reduce((n, s) => n + s.en_stock, 0);
  const pointsMobiles = points.filter((p) => p.type_point === "mobile").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Colis attendus" value={attendus} />
        <Kpi label="Colis reçus" value={recus} />
        <Kpi label="Écarts" value={ecarts} accent={ecarts > 0} sub="à vérifier" />
        <Kpi label="Stock entrepôt" value={stockEntrepot} sub="terminaux" />
        <Kpi label="Stock aux points" value={stockPoints} sub="terminaux" />
        <Kpi label="Points mobiles" value={pointsMobiles} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="font-semibold flex items-center gap-2 mb-3"><Warehouse size={17} className="text-pass-blue" /> État du stock par lieu</div>
          {stock.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun terminal en stock.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-400 border-b border-slate-200">
                <th className="py-1.5 font-medium">Lieu</th><th className="font-medium">Modèle</th>
                <th className="font-medium text-right">En stock</th><th className="font-medium text-right">Remis</th></tr></thead>
              <tbody>
                {stock.map((s, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5">{s.lieu} <span className="text-[10px] text-slate-400">({s.niveau})</span></td>
                    <td>{s.modele}</td><td className="text-right font-mono">{s.en_stock}</td>
                    <td className="text-right font-mono text-slate-400">{s.remis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card p-5">
          <div className="font-semibold flex items-center gap-2 mb-3"><ArrowRightLeft size={17} className="text-pass-blue" /> Derniers mouvements de stock</div>
          {mouvements.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun mouvement enregistré.</p>
          ) : (
            <div className="space-y-2">
              {mouvements.map((m) => (
                <div key={m.id_mouvement} className="flex items-center justify-between text-sm border-b border-slate-100 last:border-0 pb-1.5">
                  <span className="flex items-center gap-2">
                    <StatutPill tone={m.type_mvt === "reception" ? "vert" : m.type_mvt === "transfert" ? "bleu" : m.type_mvt === "retour" ? "orange" : "gris"}>
                      {L.LIBELLE_MOUVEMENT[m.type_mvt]}
                    </StatutPill>
                    <span className="text-slate-600">{m.origine} → {m.destination}</span>
                  </span>
                  <span className="text-slate-400 text-xs">×{m.quantite} · {formatDateHeure(m.horodatage)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================ ARRIVAGES & COLISAGE ============================
function TabArrivages({ superviseur, charger, fournisseurs, arrivages, colis }: Ctx) {
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState("");
  const [idF, setIdF] = useState("");
  const [datePrevue, setDatePrevue] = useState("");
  const [lignes, setLignes] = useState<L.LigneColisage[]>([{ modele: "", quantite: 50, imei_debut: "" }]);
  // création fournisseur
  const [nvF, setNvF] = useState(false);
  const [fRaison, setFRaison] = useState(""); const [fPays, setFPays] = useState("");

  async function creerF() {
    if (!fRaison.trim()) return;
    setBusy(true);
    try { const f = await L.creerFournisseur(fRaison, fPays || "International", null, null); toast("Fournisseur créé.", "success"); setNvF(false); setFRaison(""); setFPays(""); await charger(); setIdF(f.id_fournisseur); }
    catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); } finally { setBusy(false); }
  }
  async function creerA() {
    if (!ref.trim() || !idF || lignes.some((l) => !l.modele.trim() || l.quantite <= 0)) return toast("Complétez la référence, le fournisseur et les lignes.", "error");
    setBusy(true);
    try {
      await L.creerArrivage(ref, idF, datePrevue || null, lignes);
      toast("Arrivage créé — colis attendus générés.", "success");
      setRef(""); setLignes([{ modele: "", quantite: 50, imei_debut: "" }]);
      await charger();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); } finally { setBusy(false); }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {superviseur && (
        <div className="card p-5 space-y-3">
          <div className="font-semibold flex items-center gap-2"><Plus size={17} className="text-pass-blue" /> Nouvel arrivage (liste de colisage)</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-500">Référence / BL</label><input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="BL-2024-0012" /></div>
            <div><label className="text-xs text-slate-500">Date prévue</label><input type="date" className={inputCls} value={datePrevue} onChange={(e) => setDatePrevue(e.target.value)} /></div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Fournisseur</label>
            <div className="flex gap-2">
              <select className={inputCls} value={idF} onChange={(e) => setIdF(e.target.value)}>
                <option value="">— choisir —</option>
                {fournisseurs.map((f) => <option key={f.id_fournisseur} value={f.id_fournisseur}>{f.raison_sociale} ({f.pays})</option>)}
              </select>
              <button className="btn-ghost shrink-0" onClick={() => setNvF((v) => !v)}><Building2 size={15} /> Nouveau</button>
            </div>
          </div>
          {nvF && (
            <div className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50">
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="Raison sociale" value={fRaison} onChange={(e) => setFRaison(e.target.value)} />
                <input className={inputCls} placeholder="Pays" value={fPays} onChange={(e) => setFPays(e.target.value)} />
              </div>
              <button className="btn-primary text-sm" onClick={creerF} disabled={busy}>Enregistrer le fournisseur</button>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Lignes de colisage (une boîte scannable par ligne)</label>
            {lignes.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input className={`${inputCls} col-span-5`} placeholder="Modèle" value={l.modele} onChange={(e) => setLignes((a) => a.map((x, j) => j === i ? { ...x, modele: e.target.value } : x))} />
                <input type="number" className={`${inputCls} col-span-2`} placeholder="Qté" value={l.quantite} onChange={(e) => setLignes((a) => a.map((x, j) => j === i ? { ...x, quantite: Number(e.target.value) } : x))} />
                <input className={`${inputCls} col-span-4`} placeholder="IMEI début" value={l.imei_debut} onChange={(e) => setLignes((a) => a.map((x, j) => j === i ? { ...x, imei_debut: e.target.value } : x))} />
                <button className="col-span-1 text-slate-400 hover:text-red-500" onClick={() => setLignes((a) => a.filter((_, j) => j !== i))}><X size={16} /></button>
              </div>
            ))}
            <button className="text-sm text-pass-blue hover:underline" onClick={() => setLignes((a) => [...a, { modele: "", quantite: 50, imei_debut: "" }])}>+ Ajouter une ligne</button>
          </div>
          <button className="btn-primary" onClick={creerA} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Créer l'arrivage</button>
        </div>
      )}

      <div className="card p-5">
        <div className="font-semibold flex items-center gap-2 mb-3"><ClipboardList size={17} className="text-pass-blue" /> Arrivages & colis</div>
        {arrivages.length === 0 ? <p className="text-sm text-slate-400">Aucun arrivage.</p> : (
          <div className="space-y-3">
            {arrivages.map((a) => {
              const cs = colis.filter((c) => c.id_arrivage === a.id_arrivage);
              const f = fournisseurs.find((x) => x.id_fournisseur === a.id_fournisseur);
              return (
                <div key={a.id_arrivage} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm font-semibold">{a.reference}</div>
                    <StatutPill tone={a.statut === "attendu" ? "gris" : a.statut === "en_reception" ? "bleu" : "vert"}>{L.LIBELLE_STATUT_ARRIVAGE[a.statut]}</StatutPill>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{f?.raison_sociale} · {f?.pays}</div>
                  <div className="mt-2 space-y-1">
                    {cs.map((c) => (
                      <div key={c.id_colis} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{c.code_barre}</span>
                        <span className="text-slate-500">{c.modele} · {c.quantite_recue ?? "—"}/{c.quantite_attendue}
                          {c.ecart !== 0 && c.quantite_recue != null && <span className="text-orange-600 font-semibold"> (écart {c.ecart})</span>}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================ RÉCEPTION & ENTREPÔT ============================
function TabReception({ superviseur, charger, colis, entrepots, emplacements }: Ctx) {
  const [code, setCode] = useState("");
  const [qte, setQte] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [scanOn, setScanOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const attendus = colis.filter((c) => c.statut === "attendu");
  const aRanger = colis.filter((c) => c.statut === "recu" || c.statut === "ecart");

  async function scan() {
    const BD = (window as unknown as { BarcodeDetector?: new (o: unknown) => { detect: (v: unknown) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!BD) return toast("Scanner non disponible sur ce navigateur — saisie manuelle.", "error");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setScanOn(true);
      const v = videoRef.current!; v.srcObject = stream; await v.play();
      const det = new BD({ formats: ["qr_code", "code_128", "ean_13"] });
      const tick = async () => {
        if (!videoRef.current) return;
        try {
          const codes = await det.detect(videoRef.current);
          if (codes[0]?.rawValue) { setCode(codes[0].rawValue); stop(stream); return; }
        } catch { /* continue */ }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch { toast("Caméra indisponible.", "error"); }
  }
  function stop(stream?: MediaStream) {
    setScanOn(false);
    (stream ?? (videoRef.current?.srcObject as MediaStream | null))?.getTracks().forEach((t) => t.stop());
  }

  async function receptionner() {
    if (!code.trim()) return toast("Renseignez le code-barre du colis.", "error");
    setBusy(true);
    try {
      const c = await L.receptionnerColis(code.trim(), qte);
      toast(c.ecart === 0 ? "Colis reçu conforme — terminaux créés." : `Colis reçu avec écart de ${c.ecart}.`, c.ecart === 0 ? "success" : "error");
      setCode(""); setQte(0); await charger();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); } finally { setBusy(false); }
  }
  async function ranger(idColis: string, idEmp: string) {
    if (!idEmp) return;
    try { await L.rangerColis(idColis, idEmp); toast("Colis rangé.", "success"); await charger(); }
    catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-5">
        <div className="card p-5 space-y-3">
          <div className="font-semibold flex items-center gap-2"><ScanLine size={17} className="text-pass-blue" /> Réception d'un colis <SimuleBadge /></div>
          {scanOn && (
            <div className="relative rounded-lg overflow-hidden border border-slate-300">
              <video ref={videoRef} className="w-full max-h-52 object-cover" muted playsInline />
              <button className="absolute top-2 right-2 bg-white/90 rounded-full p-1" onClick={() => stop()}><X size={16} /></button>
            </div>
          )}
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Code-barre / QR de la boîte" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn-ghost shrink-0" onClick={scan} disabled={!superviseur}><ScanLine size={15} /> Scanner</button>
          </div>
          <div>
            <label className="text-xs text-slate-500">Quantité réellement reçue</label>
            <input type="number" className={inputCls} value={qte} onChange={(e) => setQte(Number(e.target.value))} />
          </div>
          <button className="btn-primary" onClick={receptionner} disabled={busy || !superviseur}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />} Réceptionner
          </button>
          <p className="text-[11px] text-slate-400">La réception crée automatiquement les terminaux (traçabilité par IMEI) et détecte l'écart avec la liste de colisage.</p>
        </div>

        <div className="card p-5">
          <div className="font-semibold flex items-center gap-2 mb-3"><ClipboardList size={17} className="text-pass-blue" /> Colis attendus</div>
          {attendus.length === 0 ? <p className="text-sm text-slate-400">Aucun colis en attente.</p> : (
            <div className="space-y-1.5">
              {attendus.map((c) => (
                <button key={c.id_colis} onClick={() => { setCode(c.code_barre); setQte(c.quantite_attendue); }}
                  className="w-full flex items-center justify-between text-sm rounded-lg border border-slate-200 px-3 py-2 hover:border-pass-blue text-left">
                  <span className="font-mono">{c.code_barre}</span>
                  <span className="text-slate-500">{c.modele} · {c.quantite_attendue} att.</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="font-semibold flex items-center gap-2 mb-3"><Warehouse size={17} className="text-pass-blue" /> Rangement en entrepôt</div>
        {entrepots.length === 0 && <p className="text-xs text-amber-600 mb-2">Aucun entrepôt/emplacement défini — créez-en un pour ranger les colis.</p>}
        {aRanger.length === 0 ? <p className="text-sm text-slate-400">Aucun colis reçu à ranger.</p> : (
          <div className="space-y-2">
            {aRanger.map((c) => (
              <div key={c.id_colis} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm">{c.code_barre}</span>
                  <StatutPill tone={c.statut === "ecart" ? "orange" : "vert"}>{L.LIBELLE_STATUT_COLIS[c.statut]}</StatutPill>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{c.modele} · {c.quantite_recue}/{c.quantite_attendue}{c.ecart !== 0 && <span className="text-orange-600 font-semibold"> (écart {c.ecart})</span>}</div>
                <div className="flex gap-2 mt-2">
                  <select className={inputCls} disabled={!superviseur} onChange={(e) => ranger(c.id_colis, e.target.value)} defaultValue="">
                    <option value="">Ranger à l'emplacement…</option>
                    {emplacements.map((em) => {
                      const en = entrepots.find((x) => x.id_entrepot === em.id_entrepot);
                      return <option key={em.id_emplacement} value={em.id_emplacement}>{en?.libelle} · {em.code}</option>;
                    })}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
        {superviseur && <EntrepotConfig entrepots={entrepots} charger={charger} />}
      </div>
    </div>
  );
}

function EntrepotConfig({ entrepots, charger }: { entrepots: Entrepot[]; charger: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [lib, setLib] = useState(""); const [zone, setZone] = useState("");
  const [idE, setIdE] = useState(""); const [code, setCode] = useState("");
  return (
    <div className="mt-4 pt-3 border-t border-slate-200">
      <button className="text-sm text-pass-blue hover:underline" onClick={() => setOpen((v) => !v)}>{open ? "− Masquer" : "+ Gérer entrepôts & emplacements"}</button>
      {open && (
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <input className={inputCls} placeholder="Libellé entrepôt" value={lib} onChange={(e) => setLib(e.target.value)} />
            <input className={inputCls} placeholder="Zone" value={zone} onChange={(e) => setZone(e.target.value)} />
            <button className="btn-ghost text-sm" onClick={async () => { if (!lib.trim()) return; try { await L.creerEntrepot(lib, zone || "—", null); toast("Entrepôt créé.", "success"); setLib(""); setZone(""); await charger(); } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); } }}>Créer l'entrepôt</button>
          </div>
          <div className="space-y-2">
            <select className={inputCls} value={idE} onChange={(e) => setIdE(e.target.value)}>
              <option value="">Entrepôt…</option>
              {entrepots.map((en) => <option key={en.id_entrepot} value={en.id_entrepot}>{en.libelle}</option>)}
            </select>
            <input className={inputCls} placeholder="Code emplacement (A-01-03)" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn-ghost text-sm" onClick={async () => { if (!idE || !code.trim()) return; try { await L.creerEmplacement(idE, code, null); toast("Emplacement créé.", "success"); setCode(""); await charger(); } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); } }}>Créer l'emplacement</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================ POINTS MOBILES & ÉQUIPES ============================
function TabPoints({ superviseur, charger, points, agents, stock }: Ctx) {
  const [lib, setLib] = useState(""); const [zone, setZone] = useState("");
  const [lat, setLat] = useState<string>(""); const [lon, setLon] = useState<string>("");
  const [busy, setBusy] = useState(false);
  // équipe
  const [idPoint, setIdPoint] = useState(""); const [eqLib, setEqLib] = useState(""); const [vehicule, setVehicule] = useState("");
  const [membres, setMembres] = useState<string[]>([]);
  // transfert
  const [tPoint, setTPoint] = useState(""); const [tModele, setTModele] = useState(""); const [tQte, setTQte] = useState<number>(10);
  const modeles = Array.from(new Set(stock.filter((s) => s.niveau === "entrepot").map((s) => s.modele)));

  function geoloc() {
    if (!navigator.geolocation) return toast("Géolocalisation indisponible.", "error");
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude.toFixed(5)); setLon(p.coords.longitude.toFixed(5)); toast("Position récupérée.", "success"); },
      () => toast("Position refusée — saisie manuelle.", "error"),
    );
  }
  async function ouvrir() {
    if (!lib.trim() || !zone.trim()) return toast("Libellé et zone requis.", "error");
    setBusy(true);
    try { await L.ouvrirPointMobile(lib, zone, lat ? Number(lat) : null, lon ? Number(lon) : null, null, null); toast("Point mobile ouvert (mission préparée).", "success"); setLib(""); setZone(""); setLat(""); setLon(""); await charger(); }
    catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); } finally { setBusy(false); }
  }
  async function configEquipe() {
    if (!idPoint || !eqLib.trim()) return toast("Point et libellé d'équipe requis.", "error");
    try { await L.configEquipe(idPoint, eqLib, vehicule || null, null, membres); toast("Équipe paramétrée.", "success"); setEqLib(""); setVehicule(""); setMembres([]); await charger(); }
    catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
  }
  async function transferer() {
    if (!tPoint || tQte <= 0) return toast("Point et quantité requis.", "error");
    try { const b = await L.transfererVersPoint(tPoint, tModele || null, tQte, null); toast(`Bon ${b.reference} — ${b.quantite} terminaux transférés.`, "success"); await charger(); }
    catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-5">
        {superviseur && (
          <div className="card p-5 space-y-3">
            <div className="font-semibold flex items-center gap-2"><MapPin size={17} className="text-pass-blue" /> Ouvrir un point PASS mobile</div>
            <input className={inputCls} placeholder="Libellé (Point mobile Odienné-Nord)" value={lib} onChange={(e) => setLib(e.target.value)} />
            <input className={inputCls} placeholder="Zone" value={zone} onChange={(e) => setZone(e.target.value)} />
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
              <input className={inputCls} placeholder="Longitude" value={lon} onChange={(e) => setLon(e.target.value)} />
              <button className="btn-ghost shrink-0" onClick={geoloc}><MapPin size={15} /> Ma position</button>
            </div>
            <button className="btn-primary" onClick={ouvrir} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Ouvrir le point (ouvre une campagne)</button>
          </div>
        )}

        {superviseur && (
          <div className="card p-5 space-y-3">
            <div className="font-semibold flex items-center gap-2"><ArrowRightLeft size={17} className="text-pass-blue" /> Transférer du stock vers un point</div>
            <select className={inputCls} value={tPoint} onChange={(e) => setTPoint(e.target.value)}>
              <option value="">Point de destination…</option>
              {points.map((p) => <option key={p.id_point} value={p.id_point}>{p.libelle} ({p.type_point})</option>)}
            </select>
            <div className="flex gap-2">
              <select className={inputCls} value={tModele} onChange={(e) => setTModele(e.target.value)}>
                <option value="">Tout modèle</option>
                {modeles.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="number" className={`${inputCls} w-28`} value={tQte} onChange={(e) => setTQte(Number(e.target.value))} />
            </div>
            <button className="btn-accent" onClick={transferer}><ArrowRightLeft size={16} /> Émettre le bon de transfert</button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div className="card p-5">
          <div className="font-semibold flex items-center gap-2 mb-3"><MapPin size={17} className="text-pass-blue" /> Points de retrait</div>
          <div className="space-y-2">
            {points.map((p) => (
              <div key={p.id_point} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span>{p.libelle}<span className="text-xs text-slate-400"> · {p.zone}</span></span>
                <span className="flex items-center gap-2">
                  <StatutPill tone={p.type_point === "mobile" ? "orange" : "bleu"}>{p.type_point}</StatutPill>
                  {p.statut_point && <StatutPill tone={p.statut_point === "en_mission" ? "vert" : "gris"}>{p.statut_point}</StatutPill>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {superviseur && (
          <div className="card p-5 space-y-3">
            <div className="font-semibold flex items-center gap-2"><Users size={17} className="text-pass-blue" /> Paramétrer une équipe</div>
            <select className={inputCls} value={idPoint} onChange={(e) => setIdPoint(e.target.value)}>
              <option value="">Point (mobile)…</option>
              {points.filter((p) => p.type_point === "mobile").map((p) => <option key={p.id_point} value={p.id_point}>{p.libelle}</option>)}
            </select>
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Libellé équipe" value={eqLib} onChange={(e) => setEqLib(e.target.value)} />
              <input className={inputCls} placeholder="Véhicule" value={vehicule} onChange={(e) => setVehicule(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Membres</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {agents.map((a) => {
                  const on = membres.includes(a.id_agent);
                  return (
                    <button key={a.id_agent} onClick={() => setMembres((m) => on ? m.filter((x) => x !== a.id_agent) : [...m, a.id_agent])}
                      className={`text-xs rounded-full border px-2.5 py-1 ${on ? "bg-pass-blue text-white border-pass-blue" : "border-slate-300 text-slate-600"}`}>
                      {a.identite}
                    </button>
                  );
                })}
              </div>
            </div>
            <button className="btn-primary" onClick={configEquipe}><Users size={16} /> Enregistrer l'équipe</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================ MISSIONS & RAPPORTS ============================
function TabMissions({ superviseur, charger, missions, points }: Ctx) {
  const [cloture, setCloture] = useState<string | null>(null);
  const [dist, setDist] = useState<number>(0); const [ret, setRet] = useState<number>(0);
  const [inc, setInc] = useState(""); const [obs, setObs] = useState("");

  async function demarrer(id: string) {
    try { await L.demarrerMission(id); toast("Mission démarrée.", "success"); await charger(); }
    catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
  }
  async function cloturer(id: string) {
    try {
      let lat: number | null = null, lon: number | null = null;
      await new Promise<void>((res) => navigator.geolocation ? navigator.geolocation.getCurrentPosition(
        (p) => { lat = p.coords.latitude; lon = p.coords.longitude; res(); }, () => res(), { timeout: 4000 }) : res());
      await L.cloturerMission(id, dist, ret, inc || null, obs || null, lat, lon);
      toast("Mission clôturée — rapport enregistré.", "success");
      setCloture(null); setDist(0); setRet(0); setInc(""); setObs(""); await charger();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
  }

  return (
    <div className="card p-5">
      <div className="font-semibold flex items-center gap-2 mb-3"><Truck size={17} className="text-pass-blue" /> Missions de terrain</div>
      {missions.length === 0 ? <p className="text-sm text-slate-400">Aucune mission. Ouvrez un point mobile pour en créer une.</p> : (
        <div className="space-y-3">
          {missions.map((m) => {
            const p = points.find((x) => x.id_point === m.id_point_retrait);
            return (
              <div key={m.id_mission} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm font-semibold">{m.reference}</span>
                    <span className="text-sm text-slate-600"> · {p?.libelle ?? "—"}</span>
                  </div>
                  <StatutPill tone={m.statut === "en_cours" ? "vert" : m.statut === "cloturee" ? "gris" : "bleu"}>{L.LIBELLE_STATUT_MISSION[m.statut]}</StatutPill>
                </div>
                {(m.latitude != null) && <div className="text-[11px] text-slate-400 mt-0.5">📍 {m.latitude?.toFixed(4)}, {m.longitude?.toFixed(4)}</div>}
                {superviseur && m.statut !== "cloturee" && (
                  <div className="mt-2 flex gap-2">
                    {m.statut === "preparee" && <button className="btn-primary text-sm" onClick={() => demarrer(m.id_mission)}><Play size={14} /> Démarrer</button>}
                    {m.statut === "en_cours" && <button className="btn-accent text-sm" onClick={() => setCloture(cloture === m.id_mission ? null : m.id_mission)}><CheckCircle2 size={14} /> Clôturer & rapport</button>}
                  </div>
                )}
                {cloture === m.id_mission && (
                  <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs text-slate-500">Terminaux distribués</label><input type="number" className={inputCls} value={dist} onChange={(e) => setDist(Number(e.target.value))} /></div>
                      <div><label className="text-xs text-slate-500">Retours</label><input type="number" className={inputCls} value={ret} onChange={(e) => setRet(Number(e.target.value))} /></div>
                    </div>
                    <input className={inputCls} placeholder="Incidents (facultatif)" value={inc} onChange={(e) => setInc(e.target.value)} />
                    <textarea className={inputCls} placeholder="Observations" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
                    <button className="btn-primary text-sm" onClick={() => cloturer(m.id_mission)}><CheckCircle2 size={14} /> Enregistrer le rapport de mission</button>
                    <p className="text-[11px] text-slate-400">Le stock restant est calculé automatiquement et la géolocalisation du rapport est capturée.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
