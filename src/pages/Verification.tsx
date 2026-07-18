import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { RefreshCw, CheckCircle2, XCircle, HelpCircle, ArrowRight, FileText, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "../components/Toaster";
import { SimuleBadge, ReelBadge, ResultatIcon, RecoBadge, EtatBadge } from "../components/Badges";
import { ParcoursStepper } from "../components/ParcoursStepper";
import { useAuth } from "../context/AuthContext";
import {
  LIBELLE_SOURCE,
  LIBELLE_RESULTAT,
  LIBELLE_MOYEN_CONSENT,
  formatDate,
  formatDateHeure,
} from "../lib/rules";
import type { Demande, Personne, Verification as Verif, Decision, Distribution } from "../lib/types";

const ORDRE: Record<string, number> = { oneci: 0, rsu: 1, operateur: 2, historique: 3, imei: 4 };

export function Verification() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { agent } = useAuth();
  const [demande, setDemande] = useState<Demande | null>(null);
  const [personne, setPersonne] = useState<Personne | null>(null);
  const [verifs, setVerifs] = useState<Verif[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refusMode, setRefusMode] = useState(false);
  const [motif, setMotif] = useState("");

  const charger = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: dem } = await supabase.from("demande").select("*").eq("id_demande", id).maybeSingle();
    if (!dem) {
      setLoading(false);
      return;
    }
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
    setLoading(false);
  }, [id]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function relancer() {
    if (!demande) return;
    setBusy(true);
    const { error } = await supabase.rpc("pass_lancer_verifications", { p_id_demande: demande.id_demande });
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast("Vérifications relancées.", "success");
    charger();
  }

  async function decider(sens: "validee" | "refusee") {
    if (!demande) return;
    if (sens === "refusee" && !motif.trim()) return toast("Le motif de refus est obligatoire (RM-099).", "error");
    setBusy(true);
    const { error } = await supabase.rpc("pass_prononcer_decision", {
      p_id_demande: demande.id_demande,
      p_sens: sens,
      p_motif: sens === "refusee" ? motif : null,
    });
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast(sens === "validee" ? "Dossier validé." : "Dossier refusé.", "success");
    setRefusMode(false);
    charger();
  }

  async function instruire() {
    if (!demande) return;
    setBusy(true);
    const { error } = await supabase.rpc("pass_mettre_en_instruction", { p_id_demande: demande.id_demande });
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast("Dossier mis en instruction.", "success");
    charger();
  }

  if (loading) return <div className="text-slate-400">Chargement du dossier…</div>;
  if (!demande || !personne) return <div className="text-slate-500">Dossier introuvable.</div>;

  const peutDecider = agent && agent.role !== "remise";
  const decisionPrise = !!decision;
  const enAttenteDecision = !decisionPrise && (demande.etat === "soumise" || demande.etat === "a_instruire");

  const etapeActive = distribution ? 4 : decision ? 3 : demande.recommandation ? 2 : 1;

  return (
    <div className="space-y-6">
      <ParcoursStepper active={etapeActive} refused={decision?.sens === "refusee"} />

      {/* En-tête dossier */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">
              {personne.nom} {personne.prenoms}
            </h1>
            <EtatBadge etat={demande.etat} />
          </div>
          <p className="text-sm text-slate-500">
            Dossier <span className="font-mono">{demande.numero_dossier}</span> · CNI{" "}
            <span className="font-mono">{personne.numero_cni}</span> · Né(e) le {formatDate(personne.date_naissance)} ·{" "}
            {personne.zone_residence}
          </p>
        </div>
        <button onClick={relancer} className="btn-ghost" disabled={busy}>
          <RefreshCw size={16} className={busy ? "animate-spin" : ""} /> Relancer les vérifications
        </button>
      </div>

      {/* Les 4 contrôles */}
      <div className="card p-5">
        <h2 className="text-base font-semibold mb-4">Contrôles d'éligibilité</h2>
        {verifs.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune vérification. Cliquez sur « Relancer les vérifications ».</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {verifs.map((v) => {
              const d = (v.donnees_retour ?? {}) as Record<string, string>;
              return (
                <div key={v.id_verification} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">{LIBELLE_SOURCE[v.source]}</span>
                    {v.est_simule ? <SimuleBadge /> : <ReelBadge />}
                  </div>
                  <div className="flex items-center gap-2">
                    <ResultatIcon resultat={v.resultat} />
                    <span className="text-sm text-slate-600">{LIBELLE_RESULTAT[v.resultat]}</span>
                  </div>
                  {(d.detail || d.nom_operateur || d.detail_ligne) && (
                    <p className="mt-2 text-xs text-slate-400">
                      {d.nom_operateur ? `Opérateur : ${d.nom_operateur}. ` : ""}
                      {d.detail_ligne || d.detail || ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Recommandation */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 border border-slate-200 p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Recommandation du moteur</div>
            <p className="text-xs text-slate-400 mt-0.5">Le système recommande, l'agent décide.</p>
          </div>
          <RecoBadge reco={demande.recommandation} />
        </div>
      </div>

      {/* Décision */}
      <div className="card p-5">
        <h2 className="text-base font-semibold mb-4">Décision</h2>

        {decisionPrise ? (
          <div
            className={`rounded-lg border p-4 ${
              decision!.sens === "validee" ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {decision!.sens === "validee" ? (
                <CheckCircle2 className="text-emerald-600" size={20} />
              ) : (
                <XCircle className="text-red-600" size={20} />
              )}
              {decision!.sens === "validee" ? "Dossier validé" : "Dossier refusé"}
            </div>
            {decision!.sens === "refusee" && (
              <div className="mt-2 text-sm text-red-800">
                <span className="font-medium">Motif :</span> {decision!.motif}
                <div className="mt-1 text-xs text-red-600">
                  Voie de recours : le bénéficiaire peut contester cette décision auprès du centre d'enrôlement dans un
                  délai de 30 jours.
                </div>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Décision prise le {formatDateHeure(decision!.horodatage)} — irréversible (RM-092).
            </p>
          </div>
        ) : enAttenteDecision && peutDecider ? (
          <div className="space-y-3">
            {!refusMode ? (
              <div className="flex flex-wrap gap-3">
                <button onClick={() => decider("validee")} className="btn-primary" disabled={busy}>
                  <CheckCircle2 size={16} /> Valider le dossier
                </button>
                <button onClick={() => setRefusMode(true)} className="btn-danger" disabled={busy}>
                  <XCircle size={16} /> Refuser
                </button>
                {demande.etat !== "a_instruire" && (
                  <button onClick={instruire} className="btn-accent" disabled={busy}>
                    <HelpCircle size={16} /> Mettre en instruction
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="field-label">Motif du refus (obligatoire — RM-099)</label>
                <textarea
                  className="field-input"
                  rows={3}
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Ex. Bénéficiaire déjà équipé d'un smartphone 4G — hors cible."
                />
                <div className="flex gap-2">
                  <button onClick={() => decider("refusee")} className="btn-danger" disabled={busy}>
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />} Confirmer le refus
                  </button>
                  <button onClick={() => setRefusMode(false)} className="btn-ghost" disabled={busy}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-400">
              Recommandation : la décision reste à l'appréciation de l'agent habilité.
            </p>
          </div>
        ) : demande.etat === "brouillon" ? (
          <p className="text-sm text-slate-500">
            Le dossier est en brouillon. Il doit être soumis depuis l'écran d'enrôlement avant décision.
          </p>
        ) : !peutDecider ? (
          <p className="text-sm text-slate-500">Votre rôle (agent de remise) ne permet pas de prononcer une décision.</p>
        ) : (
          <p className="text-sm text-slate-500">Aucune action de décision disponible pour cet état.</p>
        )}
      </div>

      {/* Suite du parcours */}
      {demande.etat === "validee" && (
        <div className="card p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Remise du terminal</h2>
            <p className="text-sm text-slate-500">Le dossier est validé : la remise peut être effectuée.</p>
          </div>
          {distribution ? (
            <Link to={`/recu/${demande.id_demande}`} className="btn-ghost">
              <FileText size={16} /> Voir le reçu
            </Link>
          ) : (
            <button onClick={() => navigate(`/remise/${demande.id_demande}`)} className="btn-primary">
              <ArrowRight size={16} /> Procéder à la remise
            </button>
          )}
        </div>
      )}

      {/* Consentement rappel */}
      <p className="text-xs text-slate-400">
        Consentement :{" "}
        {demande.consentement
          ? `recueilli (${demande.consentement_moyen ? LIBELLE_MOYEN_CONSENT[demande.consentement_moyen] : "—"})`
          : "non recueilli"}
        .
      </p>
    </div>
  );
}
