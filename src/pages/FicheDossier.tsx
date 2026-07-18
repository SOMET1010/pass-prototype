import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, ArrowLeft, ShieldAlert } from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  LIBELLE_SOURCE,
  LIBELLE_RESULTAT,
  LIBELLE_ETAT,
  LIBELLE_RECO,
  LIBELLE_MOYEN_CONSENT,
  formatDate,
  formatDateHeure,
} from "../lib/rules";
import type {
  Demande,
  Personne,
  Verification as Verif,
  Decision,
  Distribution,
  Terminal,
} from "../lib/types";

const ORDRE: Record<string, number> = { oneci: 0, rsu: 1, operateur: 2, historique: 3, imei: 4 };

export function FicheDossier() {
  const { id } = useParams();
  const [demande, setDemande] = useState<Demande | null>(null);
  const [personne, setPersonne] = useState<Personne | null>(null);
  const [verifs, setVerifs] = useState<Verif[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: dem } = await supabase.from("demande").select("*").eq("id_demande", id).maybeSingle();
      if (!dem) return setLoading(false);
      setDemande(dem as Demande);
      const [{ data: pers }, { data: vs }, { data: dec }, { data: dist }] = await Promise.all([
        supabase.from("personne").select("*").eq("id_personne", (dem as Demande).id_personne).maybeSingle(),
        supabase.from("verification").select("*").eq("id_demande", id),
        supabase.from("decision").select("*").eq("id_demande", id).maybeSingle(),
        supabase.from("distribution").select("*").eq("id_demande", id).maybeSingle(),
      ]);
      setPersonne(pers as Personne);
      setVerifs(((vs as Verif[]) ?? []).sort((a, b) => (ORDRE[a.source] ?? 9) - (ORDRE[b.source] ?? 9)));
      setDecision((dec as Decision) ?? null);
      setDistribution((dist as Distribution) ?? null);
      if (dist) {
        const { data: term } = await supabase
          .from("terminal")
          .select("*")
          .eq("id_terminal", (dist as Distribution).id_terminal)
          .maybeSingle();
        setTerminal(term as Terminal);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="text-slate-400">Chargement…</div>;
  if (!demande || !personne) return <div className="text-slate-500">Dossier introuvable.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link to={`/verification/${demande.id_demande}`} className="text-sm text-pass-blue hover:underline flex items-center gap-1">
          <ArrowLeft size={15} /> Retour au dossier
        </Link>
        <button onClick={() => window.print()} className="btn-primary">
          <Printer size={16} /> Imprimer / Exporter en PDF
        </button>
      </div>

      <div className="card print-area p-8 space-y-6">
        {/* En-tête */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="text-lg font-bold text-pass-blue-dark">Dossier PASS — Pièce probante</div>
            <div className="text-xs text-slate-500">Programme d'Accès au Smartphone Subventionné · ANSUT</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-semibold">{demande.numero_dossier}</div>
            <div className="text-xs text-slate-500">État : {LIBELLE_ETAT[demande.etat]}</div>
          </div>
        </div>

        {/* Bénéficiaire */}
        <Section titre="Bénéficiaire">
          <Grille>
            <Champ label="Nom & prénoms" valeur={`${personne.nom} ${personne.prenoms}`} />
            <Champ label="Pièce d'identité (CNI)" valeur={personne.numero_cni} mono />
            <Champ label="Date de naissance" valeur={formatDate(personne.date_naissance)} />
            <Champ label="Zone de résidence" valeur={personne.zone_residence} />
            <Champ label="Numéro PASS" valeur={personne.id_personne.slice(0, 8).toUpperCase()} mono />
            <Champ
              label="Consentement"
              valeur={
                demande.consentement
                  ? `Recueilli (${demande.consentement_moyen ? LIBELLE_MOYEN_CONSENT[demande.consentement_moyen] : "—"})`
                  : "Non recueilli"
              }
            />
          </Grille>
        </Section>

        {/* Vérifications */}
        <Section titre="Contrôles d'éligibilité">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-200">
                <th className="py-1.5 pr-4 font-medium">Contrôle</th>
                <th className="py-1.5 pr-4 font-medium">Résultat</th>
                <th className="py-1.5 font-medium">Nature</th>
              </tr>
            </thead>
            <tbody>
              {verifs.map((v) => (
                <tr key={v.id_verification} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-4">{LIBELLE_SOURCE[v.source]}</td>
                  <td className="py-1.5 pr-4">{LIBELLE_RESULTAT[v.resultat]}</td>
                  <td className="py-1.5">{v.est_simule ? "Simulé" : "Réel"}</td>
                </tr>
              ))}
              {verifs.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-1.5 text-slate-400">Aucune vérification enregistrée.</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-2 text-sm">
            <span className="text-slate-500">Recommandation du moteur : </span>
            <strong>{demande.recommandation ? LIBELLE_RECO[demande.recommandation] : "—"}</strong>
          </p>
        </Section>

        {/* Décision */}
        <Section titre="Décision">
          {decision ? (
            <Grille>
              <Champ label="Sens" valeur={decision.sens === "validee" ? "Validée" : "Refusée"} />
              <Champ label="Date" valeur={formatDateHeure(decision.horodatage)} />
              {decision.sens === "refusee" && <Champ label="Motif" valeur={decision.motif ?? "—"} pleine />}
            </Grille>
          ) : (
            <p className="text-sm text-slate-400">Aucune décision prononcée.</p>
          )}
        </Section>

        {/* Remise */}
        <Section titre="Remise & preuve">
          {distribution ? (
            <Grille>
              <Champ label="Modèle du terminal" valeur={terminal?.modele ?? "—"} />
              <Champ label="IMEI" valeur={terminal?.imei ?? "—"} mono />
              <Champ label="Point de remise" valeur={distribution.point_remise} />
              <Champ label="Date de remise" valeur={formatDateHeure(distribution.date_remise)} />
              <Champ
                label="Activation"
                valeur={distribution.statut_activation === "active" ? "Activé" : "Non activé"}
              />
              <Champ label="Géolocalisation" valeur="Simulée — GPS non certifié (prototype)" />
            </Grille>
          ) : (
            <p className="text-sm text-slate-400">Aucune remise effectuée.</p>
          )}
        </Section>

        <div className="flex items-center gap-1.5 border-t border-slate-200 pt-3 text-[10px] text-pass-orange">
          <ShieldAlert size={12} /> Prototype de démonstration — vérifications simulées, données fictives, sans valeur
          officielle.
        </div>
      </div>
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wide text-pass-blue mb-2">{titre}</h2>
      {children}
    </section>
  );
}
function Grille({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}
function Champ({ label, valeur, mono, pleine }: { label: string; valeur: string; mono?: boolean; pleine?: boolean }) {
  return (
    <div className={pleine ? "col-span-2" : ""}>
      <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</div>
      <div className={`text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>{valeur}</div>
    </div>
  );
}
