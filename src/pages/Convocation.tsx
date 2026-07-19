import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import QRCode from "qrcode";
import { Printer, ArrowLeft, MapPin, CalendarClock, ShieldAlert } from "lucide-react";
import { supabase } from "../lib/supabase";
import { pointRecommande } from "../lib/zones";
import type { Demande, Personne, StockPoint } from "../lib/types";

export function Convocation() {
  const { id } = useParams();
  const [demande, setDemande] = useState<Demande | null>(null);
  const [personne, setPersonne] = useState<Personne | null>(null);
  const [points, setPoints] = useState<StockPoint[]>([]);
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: dem } = await supabase.from("demande").select("*").eq("id_demande", id).maybeSingle();
      if (!dem) return setLoading(false);
      setDemande(dem as Demande);
      const [{ data: pers }, { data: pts }] = await Promise.all([
        supabase.from("personne").select("*").eq("id_personne", (dem as Demande).id_personne).maybeSingle(),
        supabase.from("v_stock_points").select("*"),
      ]);
      setPersonne(pers as Personne);
      setPoints((pts as StockPoint[]) ?? []);
      QRCode.toDataURL((dem as Demande).numero_dossier, { width: 200, margin: 1 }).then(setQr);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="text-slate-400">Chargement…</div>;
  if (!demande || !personne) return <div className="text-slate-500">Dossier introuvable.</div>;

  const point = pointRecommande(points, personne.zone_residence);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link to={`/verification/${demande.id_demande}`} className="text-sm text-pass-blue hover:underline flex items-center gap-1">
          <ArrowLeft size={15} /> Retour au dossier
        </Link>
        <button onClick={() => window.print()} className="btn-primary">
          <Printer size={16} /> Imprimer la convocation
        </button>
      </div>

      <div className="card print-area p-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="font-bold text-pass-blue-dark text-lg">Convocation de retrait</div>
            <div className="text-[11px] text-slate-500">Programme d'Accès au Smartphone Subventionné · ANSUT</div>
          </div>
          <div className="text-right text-xs text-slate-500">
            Dossier
            <div className="font-mono text-sm text-slate-800">{demande.numero_dossier}</div>
          </div>
        </div>

        <p className="mt-5 text-sm text-slate-700">
          <strong>{personne.nom} {personne.prenoms}</strong>, votre demande de smartphone subventionné a été{" "}
          <strong className="text-emerald-700">acceptée</strong>. Vous êtes invité·e à venir retirer votre terminal.
        </p>

        <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-3 items-start text-sm">
          <MapPin size={18} className="text-pass-blue mt-0.5" />
          <div>
            <div className="text-slate-500 text-xs">Lieu de retrait</div>
            <div className="font-semibold text-slate-800">{point ? point.libelle : "Centre à confirmer"}</div>
          </div>
          <CalendarClock size={18} className="text-pass-blue mt-0.5" />
          <div>
            <div className="text-slate-500 text-xs">À présenter</div>
            <div className="text-slate-800">Votre pièce d'identité (CNI) et cette convocation.</div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-lg bg-slate-50 border border-slate-200 p-4">
          {qr && <img src={qr} alt="QR du dossier" className="h-28 w-28" />}
          <div className="text-xs text-slate-500">
            Présentez ce code au point de retrait. En cas de besoin, l'agent vous lira ces informations à voix haute.
            Numéro de dossier : <span className="font-mono">{demande.numero_dossier}</span>.
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3 text-[11px] text-slate-400">
          Convocation destinée aux bénéficiaires ne disposant pas d'un téléphone personnel : elle remplace ou complète la
          notification par SMS.
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-pass-orange">
          <ShieldAlert size={12} /> Prototype de démonstration — document sans valeur officielle.
        </div>
      </div>
    </div>
  );
}
