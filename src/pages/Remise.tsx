import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PackageCheck, Smartphone, Camera, MapPin, Clock, UserCheck, Lock, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fichierVersDataUrl } from "../lib/image";
import { toast } from "../components/Toaster";
import { SimuleBadge } from "../components/Badges";
import { ParcoursStepper } from "../components/ParcoursStepper";
import { useAuth } from "../context/AuthContext";
import { formatDateHeure } from "../lib/rules";
import { pointRecommande } from "../lib/zones";
import type { Demande, Personne, Terminal, StockPoint } from "../lib/types";

export function Remise() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { agent } = useAuth();
  const [demande, setDemande] = useState<Demande | null>(null);
  const [personne, setPersonne] = useState<Personne | null>(null);
  const [stock, setStock] = useState<Terminal[]>([]);
  const [points, setPoints] = useState<StockPoint[]>([]);
  const [pointId, setPointId] = useState("");
  const [terminalId, setTerminalId] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dejaRemis, setDejaRemis] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: dem } = await supabase.from("demande").select("*").eq("id_demande", id).maybeSingle();
      if (!dem) {
        setLoading(false);
        return;
      }
      setDemande(dem as Demande);
      const [{ data: pers }, { data: term }, { data: dist }, { data: pts }] = await Promise.all([
        supabase.from("personne").select("*").eq("id_personne", (dem as Demande).id_personne).maybeSingle(),
        supabase.from("terminal").select("*").eq("statut", "en_stock").order("modele"),
        supabase.from("distribution").select("id_distribution").eq("id_demande", id).maybeSingle(),
        supabase.from("v_stock_points").select("*").order("zone"),
      ]);
      setPersonne(pers as Personne);
      setStock((term as Terminal[]) ?? []);
      setDejaRemis(!!dist);
      const stockPts = (pts as StockPoint[]) ?? [];
      setPoints(stockPts);
      const reco = pointRecommande(stockPts, (pers as Personne)?.zone_residence ?? "");
      if (reco) setPointId(reco.id_point);
      setLoading(false);
    })();
  }, [id]);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhoto(await fichierVersDataUrl(file));
    } catch {
      toast("Impossible de lire l'image.", "error");
    }
  }

  async function confirmer() {
    const pointSel = points.find((p) => p.id_point === pointId);
    if (!demande || !pointSel) return toast("Sélectionnez un point de retrait.", "error");
    if (!terminalId) return toast("Sélectionnez un terminal.", "error");
    setBusy(true);
    const { error } = await supabase.rpc("pass_effectuer_remise", {
      p_id_demande: demande.id_demande,
      p_id_terminal: terminalId,
      p_point_remise: pointSel.libelle,
      p_photo_url: photo,
      p_geolocalisation: "Simulée — GPS non certifié (prototype)",
    });
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast("Remise confirmée. Preuve et journal créés.", "success");
    navigate(`/recu/${demande.id_demande}`);
  }

  if (loading) return <div className="text-slate-400">Chargement…</div>;
  if (!demande || !personne) return <div className="text-slate-500">Dossier introuvable.</div>;

  // RM-091 : remise interdite si dossier non validé
  if (demande.etat !== "validee") {
    return (
      <div className="max-w-xl">
        <div className="card p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600 mb-3">
            <Lock size={22} />
          </div>
          <h1 className="text-lg font-bold text-red-700">Remise impossible</h1>
          <p className="mt-2 text-sm text-slate-600">
            La remise ne peut être effectuée que sur un dossier <strong>validé</strong> (RM-091). Ce dossier est
            actuellement au statut « {demande.etat} ».
          </p>
          <Link to={`/verification/${demande.id_demande}`} className="btn-ghost mt-4 inline-flex">
            Retour au dossier
          </Link>
        </div>
      </div>
    );
  }

  if (dejaRemis) {
    return (
      <div className="max-w-xl">
        <div className="card p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
            <PackageCheck size={22} />
          </div>
          <h1 className="text-lg font-bold">Terminal déjà remis</h1>
          <p className="mt-2 text-sm text-slate-600">Ce dossier a déjà donné lieu à une remise.</p>
          <Link to={`/recu/${demande.id_demande}`} className="btn-primary mt-4 inline-flex">
            Voir le reçu
          </Link>
        </div>
      </div>
    );
  }

  const roleRemise = agent && (agent.role === "remise" || agent.role === "superviseur");
  const terminauxDuPoint = stock.filter((t) => t.id_point_retrait === pointId);
  const reco = pointRecommande(points, personne.zone_residence);
  const pointRecommandeLibelle = reco ? reco.libelle : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <ParcoursStepper active={3} />

      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-pass-blue-light text-pass-blue">
          <PackageCheck size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Remise du terminal</h1>
          <p className="text-sm text-slate-500">
            {personne.nom} {personne.prenoms} · dossier <span className="font-mono">{demande.numero_dossier}</span>
          </p>
        </div>
      </div>

      {!roleRemise && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Votre rôle ne permet pas d'effectuer une remise. Connectez-vous avec le compte « Remise ».
        </div>
      )}

      <div className="card p-5 space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Smartphone size={18} className="text-pass-blue" /> Point de retrait & terminal
        </h2>
        <div>
          <label className="field-label">Point de retrait</label>
          <select
            className="field-input"
            value={pointId}
            onChange={(e) => {
              setPointId(e.target.value);
              setTerminalId("");
            }}
          >
            <option value="">— Choisir un centre —</option>
            {points.map((p) => (
              <option key={p.id_point} value={p.id_point} disabled={p.stock === 0}>
                {p.libelle} ({p.stock} en stock)
              </option>
            ))}
          </select>
          {pointRecommandeLibelle && (
            <p className="mt-1 text-xs text-pass-blue">
              Recommandé pour {personne.zone_residence} : {pointRecommandeLibelle}
            </p>
          )}
        </div>
        <div>
          <label className="field-label">Terminal du centre (IMEI)</label>
          <select className="field-input" value={terminalId} onChange={(e) => setTerminalId(e.target.value)} disabled={!pointId}>
            <option value="">{pointId ? "— Choisir —" : "Sélectionnez d'abord un centre"}</option>
            {terminauxDuPoint.map((t) => (
              <option key={t.id_terminal} value={t.id_terminal}>
                {t.modele} · IMEI {t.imei}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            {pointId
              ? `${terminauxDuPoint.length} terminal(aux) disponible(s) dans ce centre. Scan IMEI non disponible en prototype.`
              : "Le stock affiché correspond au centre sélectionné."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="card p-5 space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Camera size={18} className="text-pass-blue" /> Photo de remise
          </h2>
          <div className="aspect-video w-full overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 grid place-items-center">
            {photo ? (
              <img src={photo} alt="Photo de remise" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-slate-400">Aucune photo</span>
            )}
          </div>
          <label className="btn-ghost w-full cursor-pointer">
            <Camera size={16} /> {photo ? "Changer" : "Ajouter une photo"}
            <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
          </label>
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Preuve de remise</h2>
            <SimuleBadge />
          </div>
          <p className="text-xs text-slate-400 -mt-1">Faisceau d'éléments objectifs capturés automatiquement.</p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <Clock size={16} className="text-pass-blue" /> Horodatage : {formatDateHeure(new Date().toISOString())}
            </li>
            <li className="flex items-center gap-2">
              <UserCheck size={16} className="text-pass-blue" /> Agent : {agent?.identite}
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={16} className="text-pass-blue" /> Géolocalisation : simulée (GPS non certifié)
            </li>
          </ul>
          <p className="text-xs text-slate-400">
            En production : scan IMEI matériel, GPS certifié et photo horodatée opposable.
          </p>
        </div>
      </div>

      <button onClick={confirmer} className="btn-primary" disabled={busy || !roleRemise}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
        Confirmer la remise
      </button>
    </div>
  );
}
