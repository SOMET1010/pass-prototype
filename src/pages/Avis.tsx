import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, ArrowLeft, ShieldAlert, XCircle, Scale } from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatDate, formatDateHeure } from "../lib/rules";
import ansutLogo from "../assets/ansut-logo.svg";
import type { Demande, Personne, Decision } from "../lib/types";

// Coordonnées de la voie de recours (fictives, prototype)
const RECOURS = {
  cellule: "Cellule de recours PASS — ANSUT",
  email: "recours@ansut.ci",
  tel: "+225 27 20 00 00 00",
  delaiJours: 30,
};

export function Avis() {
  const { id } = useParams();
  const [demande, setDemande] = useState<Demande | null>(null);
  const [personne, setPersonne] = useState<Personne | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: dem } = await supabase.from("demande").select("*").eq("id_demande", id).maybeSingle();
      if (!dem) return setLoading(false);
      setDemande(dem as Demande);
      const [{ data: pers }, { data: dec }] = await Promise.all([
        supabase.from("personne").select("*").eq("id_personne", (dem as Demande).id_personne).maybeSingle(),
        supabase.from("decision").select("*").eq("id_demande", id).maybeSingle(),
      ]);
      setPersonne(pers as Personne);
      setDecision((dec as Decision) ?? null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="text-slate-400">Chargement…</div>;
  if (!demande || !personne) return <div className="text-slate-500">Dossier introuvable.</div>;

  const refuse = decision?.sens === "refusee";

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link to={`/verification/${demande.id_demande}`} className="text-sm text-pass-blue hover:underline flex items-center gap-1">
          <ArrowLeft size={15} /> Retour au dossier
        </Link>
        {refuse && (
          <button onClick={() => window.print()} className="btn-primary">
            <Printer size={16} /> Imprimer l'avis
          </button>
        )}
      </div>

      {!refuse ? (
        <div className="card p-6 text-slate-600 text-sm">
          Cet avis de rejet ne concerne que les demandes refusées. Ce dossier n'est pas au statut « refusé ».
        </div>
      ) : (
        <div className="card print-area p-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <img src={ansutLogo} alt="ANSUT" className="h-9 w-auto" />
              <div className="border-l border-slate-200 pl-3">
                <div className="font-bold text-pass-blue-dark text-lg leading-tight">Avis de décision</div>
                <div className="text-[11px] text-slate-500">Programme d'Accès aux Smartphones Subventionnés</div>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              Dossier
              <div className="font-mono text-sm text-slate-800">{demande.numero_dossier}</div>
            </div>
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700">
            <XCircle size={16} /> Demande non retenue
          </div>

          <p className="mt-4 text-sm text-slate-700">
            Madame / Monsieur <strong>{personne.nom} {personne.prenoms}</strong>, après examen de votre demande de
            smartphone subventionné, celle-ci <strong>n'a pas été retenue</strong>.
          </p>

          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Motif</div>
            <p className="text-sm text-slate-800">{decision?.motif}</p>
          </div>

          {/* Voie de recours */}
          <div className="mt-5 rounded-lg bg-pass-blue-light/50 border border-pass-blue/30 p-4">
            <div className="flex items-center gap-2 text-pass-blue-dark font-semibold text-sm">
              <Scale size={16} /> Voie de recours
            </div>
            <p className="mt-1 text-sm text-slate-700">
              Vous pouvez contester cette décision dans un délai de <strong>{RECOURS.delaiJours} jours</strong> à compter
              de la présente notification. Adressez-vous à la <strong>{RECOURS.cellule}</strong> :
            </p>
            <ul className="mt-1 text-sm text-slate-700 list-disc pl-5">
              <li>par téléphone : {RECOURS.tel}</li>
              <li>par e-mail : {RECOURS.email}</li>
              <li>ou en vous présentant au centre d'enrôlement, muni de votre pièce d'identité et du présent avis.</li>
            </ul>
            <p className="mt-1 text-xs text-slate-500">
              Le recours donne lieu à un <strong>nouvel examen</strong> de votre situation par un agent instructeur.
            </p>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Notifié le {formatDateHeure(decision?.horodatage)}. Demandeur né(e) le {formatDate(personne.date_naissance)},{" "}
            {personne.zone_residence}.
          </div>

          <div className="mt-3 flex items-center gap-1.5 border-t border-slate-200 pt-3 text-[10px] text-pass-orange">
            <ShieldAlert size={12} /> Prototype de démonstration — document sans valeur officielle.
          </div>
        </div>
      )}
    </div>
  );
}
