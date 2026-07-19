import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import QRCode from "qrcode";
import { Printer, Smartphone, CheckCircle2, ShieldAlert } from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatDate } from "../lib/rules";
import { ParcoursStepper } from "../components/ParcoursStepper";
import type { Demande, Personne, Distribution, Terminal } from "../lib/types";

export function Recu() {
  const { id } = useParams();
  const [demande, setDemande] = useState<Demande | null>(null);
  const [personne, setPersonne] = useState<Personne | null>(null);
  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [qr, setQr] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: dem } = await supabase.from("demande").select("*").eq("id_demande", id).maybeSingle();
      if (!dem) {
        setLoading(false);
        return;
      }
      setDemande(dem as Demande);
      const [{ data: pers }, { data: dist }] = await Promise.all([
        supabase.from("personne").select("*").eq("id_personne", (dem as Demande).id_personne).maybeSingle(),
        supabase.from("distribution").select("*").eq("id_demande", id).maybeSingle(),
      ]);
      setPersonne(pers as Personne);
      setDistribution((dist as Distribution) ?? null);
      if (dist) {
        const { data: term } = await supabase
          .from("terminal")
          .select("*")
          .eq("id_terminal", (dist as Distribution).id_terminal)
          .maybeSingle();
        setTerminal(term as Terminal);
      }
      // QR encode uniquement le numéro de dossier (permet de retrouver le dossier, ne prouve rien).
      QRCode.toDataURL((dem as Demande).numero_dossier, { width: 220, margin: 1 }).then(setQr);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="text-slate-400">Chargement…</div>;
  if (!demande || !personne) return <div className="text-slate-500">Dossier introuvable.</div>;
  if (!distribution)
    return (
      <div className="max-w-xl text-slate-500">
        Aucune remise n'a encore été effectuée pour ce dossier.{" "}
        <Link to={`/verification/${demande.id_demande}`} className="text-pass-blue underline">
          Retour au dossier
        </Link>
      </div>
    );

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <ParcoursStepper active={4} />

      <div className="no-print flex items-center justify-between">
        <Link to={`/verification/${demande.id_demande}`} className="text-sm text-pass-blue hover:underline">
          ← Retour au dossier
        </Link>
        <button onClick={() => window.print()} className="btn-primary">
          <Printer size={16} /> Imprimer
        </button>
      </div>

      {/* Zone imprimable : reçu bénéficiaire simplifié (RM-197) */}
      <div className="card print-area p-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-pass-blue text-white">
              <Smartphone size={22} />
            </div>
            <div>
              <div className="font-bold text-pass-blue-dark text-lg leading-tight">Reçu PASS</div>
              <div className="text-[11px] text-slate-500">Programme d'Accès aux Smartphones Subventionnés · ANSUT</div>
            </div>
          </div>
          <div className="text-emerald-600 flex items-center gap-1 text-sm font-semibold">
            <CheckCircle2 size={18} /> Terminal remis
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6">
          <div className="space-y-3">
            <Info label="Numéro PASS" value={personne.id_personne.slice(0, 8).toUpperCase()} mono />
            <Info label="Numéro de dossier" value={demande.numero_dossier} mono />
            <Info label="Bénéficiaire" value={`${personne.nom} ${personne.prenoms}`} />
            <Info label="Date de remise" value={formatDate(distribution.date_remise)} />
            <Info label="Point de remise" value={distribution.point_remise} />
            <Info label="Modèle du terminal" value={terminal?.modele ?? "—"} />
          </div>
          <div className="flex flex-col items-center justify-center">
            {qr && <img src={qr} alt="QR code du dossier" className="h-40 w-40" />}
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Présentez ce code pour retrouver votre dossier.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-400">
          Ce reçu atteste de la remise d'un terminal subventionné. Il ne contient pas les données du dossier probant
          (identité, vérifications, IMEI, géolocalisation), conservées séparément dans le système (RM-197).
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-pass-orange">
          <ShieldAlert size={12} /> Prototype de démonstration — document sans valeur officielle.
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</div>
      <div className={`text-sm text-slate-800 ${mono ? "font-mono" : "font-medium"}`}>{value}</div>
    </div>
  );
}
