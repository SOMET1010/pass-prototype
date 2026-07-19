import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { RefreshCw, CheckCircle2, XCircle, HelpCircle, ArrowRight, FileText, FileDown, Zap, Loader2, MapPin, MessageSquare, Send, Wrench, Timer, Archive } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "../components/Toaster";
import { SimuleBadge, ReelBadge, ResultatIcon, RecoBadge, EtatBadge } from "../components/Badges";
import { ParcoursStepper } from "../components/ParcoursStepper";
import { pointRecommande } from "../lib/zones";
import { useAuth } from "../context/AuthContext";
import {
  LIBELLE_SOURCE,
  LIBELLE_RESULTAT,
  LIBELLE_MOYEN_CONSENT,
  LIBELLE_STATUT_TERMINAL,
  LIBELLE_SAV_TYPE,
  LIBELLE_SAV_STATUT,
  LIBELLE_CONTACT_RELATION,
  formatDate,
  formatDateHeure,
  formatDuree,
  delaiSecondes,
} from "../lib/rules";
import type { Demande, Personne, Verification as Verif, Decision, Distribution, StockPoint, Notification, SavTicket, Terminal, TypeSav, Cloture } from "../lib/types";

const ORDRE: Record<string, number> = { oneci: 0, rsu: 1, operateur: 2, historique: 3, imei: 4 };

/** Numéro de téléphone fictif déterministe (prototype, aucune donnée réelle). */
function numeroSimule(cni: string): string {
  const d = (cni.match(/\d/g) ?? []).join("").padEnd(8, "0").slice(-8);
  return `+225 07 ${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)}`;
}

export function Verification() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { agent } = useAuth();
  const [demande, setDemande] = useState<Demande | null>(null);
  const [personne, setPersonne] = useState<Personne | null>(null);
  const [verifs, setVerifs] = useState<Verif[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [pointsStock, setPointsStock] = useState<StockPoint[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [terminalRemis, setTerminalRemis] = useState<Terminal | null>(null);
  const [savTickets, setSavTickets] = useState<SavTicket[]>([]);
  const [cloture, setCloture] = useState<Cloture | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refusMode, setRefusMode] = useState(false);
  const [motif, setMotif] = useState("");
  const [clotConforme, setClotConforme] = useState(true);
  const [clotObs, setClotObs] = useState("");
  const [incidentType, setIncidentType] = useState<TypeSav>("panne");
  const [incidentDesc, setIncidentDesc] = useState("");
  const [showIncident, setShowIncident] = useState(false);

  const charger = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: dem } = await supabase.from("demande").select("*").eq("id_demande", id).maybeSingle();
    if (!dem) {
      setLoading(false);
      return;
    }
    setDemande(dem as Demande);
    const [{ data: pers }, { data: vs }, { data: dec }, { data: dist }, { data: pts }, { data: nt }, { data: clot }] =
      await Promise.all([
        supabase.from("personne").select("*").eq("id_personne", (dem as Demande).id_personne).maybeSingle(),
        supabase.from("verification").select("*").eq("id_demande", id),
        supabase.from("decision").select("*").eq("id_demande", id).maybeSingle(),
        supabase.from("distribution").select("*").eq("id_demande", id).maybeSingle(),
        supabase.from("v_stock_points").select("*"),
        supabase.from("notification").select("*").eq("id_demande", id).order("horodatage", { ascending: false }),
        supabase.from("cloture").select("*").eq("id_demande", id).maybeSingle(),
      ]);
    setPersonne(pers as Personne);
    setVerifs(((vs as Verif[]) ?? []).sort((a, b) => (ORDRE[a.source] ?? 9) - (ORDRE[b.source] ?? 9)));
    setDecision((dec as Decision) ?? null);
    setDistribution((dist as Distribution) ?? null);
    setPointsStock((pts as StockPoint[]) ?? []);
    setNotifs((nt as Notification[]) ?? []);
    setCloture((clot as Cloture) ?? null);
    // SAV : terminal remis + tickets
    if (dist) {
      const distrib = dist as Distribution;
      const [{ data: term }, { data: sav }] = await Promise.all([
        supabase.from("terminal").select("*").eq("id_terminal", distrib.id_terminal).maybeSingle(),
        supabase.from("sav_ticket").select("*").eq("id_distribution", distrib.id_distribution).order("created_at", { ascending: false }),
      ]);
      setTerminalRemis((term as Terminal) ?? null);
      setSavTickets((sav as SavTicket[]) ?? []);
    } else {
      setTerminalRemis(null);
      setSavTickets([]);
    }
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

  async function activer() {
    if (!demande) return;
    setBusy(true);
    const { error } = await supabase.rpc("pass_activer_terminal", { p_id_demande: demande.id_demande });
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast("Terminal marqué comme activé.", "success");
    charger();
  }

  async function envoyerSms() {
    if (!demande || !personne) return;
    const pr = pointRecommande(pointsStock, personne.zone_residence);
    if (!pr) return toast("Aucun point de retrait avec stock à communiquer.", "error");
    const dest = personne.telephone_contact || numeroSimule(personne.numero_cni);
    const lieu = pr.adresse ? `${pr.libelle}, ${pr.adresse}` : `${pr.libelle} (${pr.zone})`;
    const tel = pr.telephone ? ` Tel centre: ${pr.telephone}.` : "";
    const msg = `PASS: Votre demande ${demande.numero_dossier} est validee. Retirez votre smartphone subventionne au ${lieu}.${tel} Munissez-vous de votre piece d'identite.`;
    setBusy(true);
    const { error } = await supabase.rpc("pass_notifier_sms", {
      p_id_demande: demande.id_demande,
      p_destinataire: dest,
      p_message: msg,
    });
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast("SMS simulé envoyé au bénéficiaire.", "success");
    charger();
  }

  async function notifierRefus() {
    if (!demande || !personne || !decision) return;
    const dest = personne.telephone_contact || numeroSimule(personne.numero_cni);
    const msg = `PASS: Votre demande ${demande.numero_dossier} n'a pas ete retenue. Motif: ${decision.motif}. Recours possible sous 30 jours: recours@ansut.ci / +225 27 20 00 00 00.`;
    setBusy(true);
    const { error } = await supabase.rpc("pass_notifier_sms", {
      p_id_demande: demande.id_demande,
      p_destinataire: dest,
      p_message: msg,
    });
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast("Notification de refus envoyée (simulé).", "success");
    charger();
  }

  async function declarerIncident() {
    if (!distribution) return;
    setBusy(true);
    const { error } = await supabase.rpc("pass_ouvrir_sav", {
      p_id_distribution: distribution.id_distribution,
      p_type: incidentType,
      p_description: incidentDesc || null,
    });
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast("Incident SAV enregistré.", "success");
    setShowIncident(false);
    setIncidentDesc("");
    setIncidentType("panne");
    charger();
  }

  async function cloturer() {
    if (!demande) return;
    setBusy(true);
    const { error } = await supabase.rpc("pass_cloturer", {
      p_id_demande: demande.id_demande,
      p_conforme: clotConforme,
      p_observations: clotObs || null,
    });
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast("Opération clôturée après audit.", "success");
    setClotObs("");
    charger();
  }

  if (loading) return <div className="text-slate-400">Chargement du dossier…</div>;
  if (!demande || !personne) return <div className="text-slate-500">Dossier introuvable.</div>;

  const peutDecider = agent && agent.role !== "remise";
  const decisionPrise = !!decision;
  const enAttenteDecision = !decisionPrise && (demande.etat === "soumise" || demande.etat === "a_instruire");

  const etapeActive = distribution ? 4 : decision ? 3 : demande.recommandation ? 2 : 1;
  const pointRetrait = pointRecommande(pointsStock, personne.zone_residence);
  const memeZone = pointRetrait?.zone === personne.zone_residence;
  const sansContactTel = personne.contact_relation === "aucun" || !personne.telephone_contact;
  const destinataireContact = personne.telephone_contact || numeroSimule(personne.numero_cni);
  const relationLabel = personne.contact_relation ? LIBELLE_CONTACT_RELATION[personne.contact_relation] : "Non renseigné";

  // Indicateurs de délai (SLA)
  const delaiReponse = decision ? delaiSecondes(demande.date_soumission, decision.horodatage) : null;
  const delaiRemise = decision && distribution ? delaiSecondes(decision.horodatage, distribution.date_remise) : null;
  const enrolOK = demande.duree_enrolement_sec != null && demande.duree_enrolement_sec <= 60;
  const reponseOK = delaiReponse != null && delaiReponse <= 12 * 3600;
  const operationComplete = !!decision && (decision.sens === "refusee" || !!distribution);
  const peutCloturer = agent?.role === "superviseur" || agent?.role === "instructeur";

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
        <div className="flex flex-wrap gap-2">
          <Link to={`/fiche/${demande.id_demande}`} className="btn-ghost">
            <FileDown size={16} /> Exporter la fiche (PDF)
          </Link>
          <button onClick={relancer} className="btn-ghost" disabled={busy}>
            <RefreshCw size={16} className={busy ? "animate-spin" : ""} /> Relancer les vérifications
          </button>
        </div>
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
                  Voie de recours : le bénéficiaire peut contester cette décision sous 30 jours (Cellule de recours PASS
                  ou centre d'enrôlement).
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={`/avis/${demande.id_demande}`} className="btn-ghost !py-1.5 text-sm">
                    <FileText size={15} /> Avis de rejet (à remettre)
                  </Link>
                  <button onClick={notifierRefus} className="btn-ghost !py-1.5 text-sm" disabled={busy}>
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Notifier le refus (SMS)
                    <SimuleBadge />
                  </button>
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
        <div className="card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Remise du terminal</h2>
              <p className="text-sm text-slate-500">
                {distribution ? "Terminal remis." : "Le dossier est validé : la remise peut être effectuée."}
              </p>
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

          {/* Point de retrait le plus proche avec stock */}
          {!distribution && (
            <div className="flex items-start gap-3 rounded-lg border border-pass-blue/30 bg-pass-blue-light/50 p-4">
              <MapPin size={18} className="mt-0.5 shrink-0 text-pass-blue" />
              {pointRetrait ? (
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    Point de retrait recommandé : {pointRetrait.libelle}
                  </div>
                  {pointRetrait.adresse && <div className="text-xs text-slate-500">{pointRetrait.adresse}</div>}
                  <div className="text-xs text-slate-500">
                    {pointRetrait.telephone && <>Tél. {pointRetrait.telephone} · </>}
                    {pointRetrait.gestionnaire && <>Resp. {pointRetrait.gestionnaire}</>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {pointRetrait.stock} terminal{pointRetrait.stock > 1 ? "s" : ""} en stock ·{" "}
                    {memeZone ? (
                      <span className="text-emerald-700 font-medium">dans la zone du bénéficiaire ({personne.zone_residence})</span>
                    ) : (
                      <span className="text-pass-orange font-medium">
                        aucun stock à {personne.zone_residence} — centre le plus proche approvisionné
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-700">
                  Aucun point de retrait ne dispose de stock actuellement. Réapprovisionnement nécessaire.
                </div>
              )}
            </div>
          )}

          {distribution && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Statut d'activation :</span>
                {distribution.statut_activation === "active" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-300">
                    <Zap size={12} /> Activé
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 border border-slate-300">
                    Non activé
                  </span>
                )}
              </div>
              {distribution.statut_activation !== "active" && agent && (agent.role === "remise" || agent.role === "superviseur") && (
                <button onClick={activer} className="btn-accent !py-2" disabled={busy}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />} Marquer comme activé
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notification du bénéficiaire (le bénéficiaire n'a souvent pas de téléphone) */}
      {demande.etat === "validee" && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-pass-blue" />
            <h2 className="text-base font-semibold">Notification du bénéficiaire — lieu de retrait</h2>
          </div>

          {/* Canal de notification */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-1">Canal de notification</div>
            <div className="text-slate-700">
              {sansContactTel ? (
                <>Aucun téléphone joignable — <strong>convocation papier</strong> remise sur place.</>
              ) : (
                <>
                  SMS vers <strong className="font-mono">{destinataireContact}</strong> —{" "}
                  <span className="text-slate-500">{relationLabel}</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Le bénéficiaire est ciblé car il ne possède pas de smartphone : la notification passe par un contact
              (proche, ménage, relais) et/ou une convocation papier.
            </p>
          </div>

          {pointRetrait ? (
            <div className="flex flex-wrap items-center gap-2">
              {!sansContactTel && (
                <button onClick={envoyerSms} className="btn-accent" disabled={busy}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Envoyer le SMS <SimuleBadge />
                </button>
              )}
              <Link to={`/convocation/${demande.id_demande}`} className="btn-ghost">
                <FileText size={16} /> Convocation de retrait (papier)
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucun point de retrait avec stock à communiquer pour le moment.</p>
          )}

          {notifs.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Historique des envois</div>
              {notifs.map((n) => (
                <div key={n.id_notification} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{n.destinataire} · {n.canal.toUpperCase()}</span>
                    <span className="flex items-center gap-2">
                      {formatDateHeure(n.horodatage)}
                      <SimuleBadge />
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suivi après remise (SAV) */}
      {distribution && terminalRemis && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wrench size={18} className="text-pass-blue" />
              <h2 className="text-base font-semibold">Suivi après remise (SAV)</h2>
            </div>
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                terminalRemis.statut === "remis"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-red-50 text-red-700 border-red-300"
              }`}
            >
              Terminal : {LIBELLE_STATUT_TERMINAL[terminalRemis.statut]}
            </span>
          </div>
          <div className="text-sm text-slate-500">
            {terminalRemis.modele} · IMEI <span className="font-mono">{terminalRemis.imei}</span>
          </div>

          {agent && agent.role !== "enrolement" && (
            !showIncident ? (
              <button onClick={() => setShowIncident(true)} className="btn-ghost">
                <Wrench size={16} /> Déclarer un incident
              </button>
            ) : (
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(["perte", "vol", "panne", "autre"] as TypeSav[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setIncidentType(t)}
                      className={`rounded-md border px-3 py-2 text-sm ${
                        incidentType === t ? "border-pass-blue bg-pass-blue-light font-semibold text-pass-blue" : "border-slate-300"
                      }`}
                    >
                      {LIBELLE_SAV_TYPE[t]}
                    </button>
                  ))}
                </div>
                <textarea
                  className="field-input"
                  rows={2}
                  placeholder="Description de l'incident"
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                />
                <p className="text-xs text-slate-400">
                  « Vol » bloque le terminal (IMEI) contre la revente ; « Perte » le marque comme perdu.
                </p>
                <div className="flex gap-2">
                  <button onClick={declarerIncident} className="btn-primary" disabled={busy}>
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />} Enregistrer l'incident
                  </button>
                  <button onClick={() => setShowIncident(false)} className="btn-ghost" disabled={busy}>
                    Annuler
                  </button>
                </div>
              </div>
            )
          )}

          {savTickets.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Incidents</div>
              {savTickets.map((t) => (
                <div key={t.id_ticket} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      {LIBELLE_SAV_TYPE[t.type_incident]} — {LIBELLE_SAV_STATUT[t.statut]}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateHeure(t.created_at)}</span>
                  </div>
                  {t.description && <p className="text-sm text-slate-600 mt-1">{t.description}</p>}
                  {t.resolution && <p className="text-sm text-emerald-700 mt-1">Résolution : {t.resolution}</p>}
                </div>
              ))}
              <Link to="/sav" className="text-sm text-pass-blue hover:underline">
                Ouvrir le module SAV →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Indicateurs de délai (SLA) */}
      {(demande.date_soumission || demande.duree_enrolement_sec != null) && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Timer size={18} className="text-pass-blue" />
            <h2 className="text-base font-semibold">Indicateurs de délai (qualité de service)</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <SlaTile label="Enrôlement" cible="Objectif < 1 min" valeur={formatDuree(demande.duree_enrolement_sec)} ok={demande.duree_enrolement_sec != null ? enrolOK : null} />
            <SlaTile label="Réponse (décision)" cible="Objectif ≤ 12 h" valeur={formatDuree(delaiReponse)} ok={delaiReponse != null ? reponseOK : null} />
            <SlaTile label="Remise du terminal" cible="Délai mesuré" valeur={formatDuree(delaiRemise)} ok={null} />
          </div>
        </div>
      )}

      {/* Clôture de l'opération (après audit) */}
      {operationComplete && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Archive size={18} className="text-pass-blue" />
              <h2 className="text-base font-semibold">Clôture de l'opération</h2>
            </div>
            {cloture && (
              <span
                className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  cloture.conforme
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-red-50 text-red-700 border-red-300"
                }`}
              >
                Clôturé — {cloture.conforme ? "conforme" : "non conforme"}
              </span>
            )}
          </div>

          {cloture ? (
            <div className="text-sm text-slate-600">
              Audit de la procédure réalisé le {formatDateHeure(cloture.horodatage)}.
              {cloture.observations && <div className="mt-1">Observations : {cloture.observations}</div>}
            </div>
          ) : peutCloturer ? (
            <>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-sm font-medium text-slate-700 mb-2">Audit de la procédure</div>
                <ul className="space-y-1 text-sm">
                  <AuditItem ok={personne.statut_verif_identite === "verifie" || verifs.some((v) => v.source === "oneci" && v.resultat === "concluant")}>
                    Identité vérifiée
                  </AuditItem>
                  <AuditItem ok={demande.consentement}>Consentement recueilli</AuditItem>
                  <AuditItem ok={!!decision}>Décision prononcée et motivée</AuditItem>
                  {decision?.sens === "validee" && <AuditItem ok={!!distribution}>Remise effectuée et preuve constituée</AuditItem>}
                  <AuditItem ok>Opérations tracées au journal d'audit</AuditItem>
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setClotConforme(true)}
                  className={`rounded-md border px-3 py-2 text-sm ${clotConforme ? "border-emerald-400 bg-emerald-50 font-semibold text-emerald-700" : "border-slate-300"}`}
                >
                  Procédure conforme
                </button>
                <button
                  onClick={() => setClotConforme(false)}
                  className={`rounded-md border px-3 py-2 text-sm ${!clotConforme ? "border-red-400 bg-red-50 font-semibold text-red-700" : "border-slate-300"}`}
                >
                  Non conforme
                </button>
              </div>
              <textarea
                className="field-input"
                rows={2}
                placeholder="Observations d'audit (optionnel)"
                value={clotObs}
                onChange={(e) => setClotObs(e.target.value)}
              />
              <button onClick={cloturer} className="btn-primary" disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />} Clôturer l'opération
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Opération complète — en attente de clôture après audit par l'instructeur / superviseur.
            </p>
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

function SlaTile({ label, cible, valeur, ok }: { label: string; cible: string; valeur: string; ok: boolean | null }) {
  const tone =
    ok === null
      ? "bg-slate-50 text-slate-600 border-slate-200"
      : ok
        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
        : "bg-amber-50 text-amber-700 border-amber-300";
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <div className="text-xs uppercase tracking-wide font-semibold opacity-70">{label}</div>
      <div className="text-xl font-bold mt-0.5">{valeur}</div>
      <div className="text-[11px] mt-0.5 opacity-80">
        {cible}
        {ok !== null && (ok ? " · respecté" : " · dépassé")}
      </div>
    </div>
  );
}

function AuditItem({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? <CheckCircle2 size={15} className="text-emerald-600" /> : <XCircle size={15} className="text-red-500" />}
      <span className={ok ? "text-slate-600" : "text-red-600"}>{children}</span>
    </li>
  );
}
