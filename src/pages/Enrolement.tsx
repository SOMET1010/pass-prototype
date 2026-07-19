import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, IdCard, Camera, ShieldCheck, ArrowRight, Loader2, Eraser, ScanLine, Timer } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fichierVersDataUrl } from "../lib/image";
import { toast } from "../components/Toaster";
import { SimuleBadge, ResultatIcon } from "../components/Badges";
import { ParcoursStepper } from "../components/ParcoursStepper";
import { SignaturePad, type SignaturePadHandle } from "../components/SignaturePad";
import { LIBELLE_RESULTAT } from "../lib/rules";
import type { Campagne, Demande, ResultatVerif, MoyenConsentement } from "../lib/types";

const PERSONAS = [
  { label: "Mariam KOUASSI", nom: "KOUASSI", prenoms: "Mariam", cni: "CI-001-334455", nni: "10001334455", cmu: "CMU-2020-334455", dn: "1972-04-12", zone: "Korhogo" },
  { label: "Adama TRAORÉ", nom: "TRAORÉ", prenoms: "Adama", cni: "CI-002-778899", nni: "10002778899", cmu: "", dn: "1994-09-03", zone: "Bouaké" },
  { label: "Awa DIALLO", nom: "DIALLO", prenoms: "Awa", cni: "CI-003-112233", nni: "10003112233", cmu: "", dn: "1988-01-20", zone: "Man" },
  { label: "Koffi Yao", nom: "KOFFI YAO", prenoms: "N'GUESSAN", cni: "CI-004-556677", nni: "10004556677", cmu: "", dn: "1965-11-30", zone: "Odienné" },
  { label: "Fatou COULIBALY", nom: "COULIBALY", prenoms: "Fatou", cni: "CI-005-990011", nni: "10005990011", cmu: "CMU-2021-990011", dn: "1970-06-15", zone: "Korhogo" },
];

export function Enrolement() {
  const navigate = useNavigate();
  const [campagne, setCampagne] = useState<Campagne | null>(null);

  const [cni, setCni] = useState("");
  const [nni, setNni] = useState("");
  const [cmu, setCmu] = useState("");
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [dn, setDn] = useState("");
  const [zone, setZone] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [piecePhoto, setPiecePhoto] = useState<string | null>(null);
  const [cmuPhoto, setCmuPhoto] = useState<string | null>(null);
  const [pieceScan, setPieceScan] = useState(false);
  const [cmuScan, setCmuScan] = useState(false);
  const [cmuDispo, setCmuDispo] = useState("");

  const [demande, setDemande] = useState<Demande | null>(null);
  const [identite, setIdentite] = useState<ResultatVerif | null>(null);
  const [moyen, setMoyen] = useState<MoyenConsentement>("signature");
  const [consent, setConsent] = useState(false);
  const [temoin, setTemoin] = useState("");
  const [otp, setOtp] = useState("");
  const sigRef = useRef<SignaturePadHandle>(null);
  const [contactRelation, setContactRelation] = useState("menage");
  const [contactTel, setContactTel] = useState("");
  const [busy, setBusy] = useState(false);

  // Chronomètre d'enrôlement (objectif < 1 min avec toutes les pièces)
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [doneAt, setDoneAt] = useState<number | null>(null);
  function startChrono() {
    setStartedAt((s) => s ?? Date.now());
  }
  useEffect(() => {
    if (!startedAt || doneAt) return;
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [startedAt, doneAt]);
  const elapsed = startedAt ? Math.round(((doneAt ?? Date.now()) - startedAt) / 1000) : 0;
  const chronoStr = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  void tick;

  useEffect(() => {
    supabase
      .from("campagne")
      .select("*")
      .eq("etat", "ouverte")
      .order("date_debut", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setCampagne(data as Campagne));
  }, []);

  const champsComplets = cni.trim() && nom.trim() && prenoms.trim() && dn && zone.trim();

  // Simule la lecture automatique (OCR) d'une pièce de démonstration.
  // Avec toutes les pièces disponibles, un seul scan renseigne CNI + NNI + CMU.
  function scannerPiece(p: (typeof PERSONAS)[number]) {
    startChrono();
    setCni(p.cni);
    setNni(p.nni);
    setNom(p.nom);
    setPrenoms(p.prenoms);
    setDn(p.dn);
    setZone(p.zone);
    setPieceScan(true);
    setCmuDispo(p.cmu);
    if (p.cmu) {
      setCmu(p.cmu);
      setCmuScan(true);
      toast("Pièces lues : identité, NNI et carte CMU extraits (simulé).", "success");
    } else {
      setCmu("");
      setCmuScan(false);
      toast("Pièce lue : identité et NNI extraits (simulé).", "success");
    }
  }

  // Simule la lecture de la carte CMU (éligibilité sociale).
  function scannerCmu() {
    if (!pieceScan) return toast("Scannez d'abord une pièce d'identité de démonstration.", "info");
    if (!cmuDispo) return toast("Aucune carte CMU détectée pour ce bénéficiaire.", "info");
    setCmu(cmuDispo);
    setCmuScan(true);
    toast("Carte CMU lue : ayant droit confirmé (simulé).", "success");
  }

  async function lireImage(e: React.ChangeEvent<HTMLInputElement>, set: (v: string) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      set(await fichierVersDataUrl(file));
    } catch {
      toast("Impossible de lire l'image.", "error");
    }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    await lireImage(e, setPhoto);
  }

  async function verifierIdentite() {
    startChrono();
    if (!campagne) return toast("Aucune campagne ouverte.", "error");
    if (!champsComplets) return toast("Tous les champs obligatoires doivent être renseignés (RM-064).", "error");
    setBusy(true);
    const { data, error } = await supabase.rpc("pass_enroler", {
      p_numero_cni: cni,
      p_nom: nom,
      p_prenoms: prenoms,
      p_date_naissance: dn,
      p_zone_residence: zone,
      p_photo_url: photo,
      p_id_campagne: campagne.id_campagne,
      p_canal: "assiste",
    });
    if (error) {
      setBusy(false);
      return toast(error.message, "error");
    }
    const dem = (data as any).demande as Demande;
    if ((data as any).demande_existante) {
      setBusy(false);
      toast("Une demande existe déjà pour cette personne sur la campagne. Ouverture du dossier…", "info");
      return navigate(`/verification/${dem.id_demande}`);
    }
    // Enregistre les données de pièce lues (NNI, n° CMU, photos des pièces)
    await supabase.rpc("pass_maj_piece", {
      p_id_personne: dem.id_personne,
      p_nni: nni || null,
      p_numero_cmu: cmu || null,
      p_piece_photo_url: piecePhoto,
      p_cmu_photo_url: cmuPhoto,
    });
    // Lance les vérifications (identité ONECI simulée + autres) et calcule la recommandation.
    const { data: verif, error: e2 } = await supabase.rpc("pass_lancer_verifications", {
      p_id_demande: dem.id_demande,
    });
    setBusy(false);
    if (e2) return toast(e2.message, "error");
    setDemande(dem);
    setIdentite((verif as any).identite as ResultatVerif);
    toast(`Dossier ${dem.numero_dossier} créé. Identité vérifiée (simulé).`, "success");
  }

  async function enregistrer(soumettre: boolean) {
    if (!demande) return;
    setBusy(true);
    // Contact de notification (le bénéficiaire n'a souvent pas de téléphone personnel)
    await supabase.rpc("pass_maj_contact", {
      p_id_personne: demande.id_personne,
      p_telephone: contactRelation === "aucun" ? null : contactTel,
      p_relation: contactRelation,
    });
    const sig = moyen === "signature" ? sigRef.current?.toDataURL() ?? null : null;
    if (soumettre && consent) {
      if (moyen === "signature" && !sig) {
        setBusy(false);
        return toast("La signature du bénéficiaire est requise.", "error");
      }
      if (moyen === "assiste_temoin" && !temoin.trim()) {
        setBusy(false);
        return toast("Le nom du témoin est requis pour un consentement assisté.", "error");
      }
    }
    if (consent) {
      const { error } = await supabase.rpc("pass_enregistrer_consentement", {
        p_id_demande: demande.id_demande,
        p_moyen: moyen,
        p_signature: sig,
        p_temoin: moyen === "assiste_temoin" ? temoin : null,
      });
      if (error) {
        setBusy(false);
        return toast(error.message, "error");
      }
    }
    if (soumettre) {
      if (!consent) {
        setBusy(false);
        return toast("Le consentement est obligatoire pour soumettre (RM-184).", "error");
      }
      const secs = startedAt ? Math.round((Date.now() - startedAt) / 1000) : null;
      const { error } = await supabase.rpc("pass_soumettre_demande", {
        p_id_demande: demande.id_demande,
        p_duree_sec: secs,
      });
      setBusy(false);
      if (error) return toast(error.message, "error");
      setDoneAt(Date.now());
      toast(secs !== null ? `Dossier soumis en ${secs} s. Passage à la vérification.` : "Dossier soumis.", "success");
      return navigate(`/verification/${demande.id_demande}`);
    }
    setBusy(false);
    toast("Brouillon enregistré (RM-063).", "success");
  }

  return (
    <div className="space-y-6">
      <ParcoursStepper active={demande ? 1 : 0} />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-pass-blue-light text-pass-blue">
            <UserPlus size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Enrôlement assisté</h1>
            <p className="text-sm text-slate-500">
              {campagne ? (
                <>Campagne : <strong>{campagne.libelle}</strong></>
              ) : (
                "Chargement de la campagne…"
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold border ${
              !startedAt
                ? "bg-slate-50 text-slate-400 border-slate-200"
                : elapsed <= 60
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : elapsed <= 90
                    ? "bg-amber-50 text-amber-700 border-amber-300"
                    : "bg-red-50 text-red-700 border-red-300"
            }`}
          >
            <Timer size={15} />
            {doneAt ? `Enrôlé en ${chronoStr}` : chronoStr}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Objectif &lt; 1 min</div>
        </div>
      </div>

      {/* Scan de pièce (lecture automatique simulée) */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ScanLine size={18} className="text-pass-blue" />
          <h2 className="text-base font-semibold">Lecture automatique des pièces</h2>
          <SimuleBadge />
        </div>
        <p className="text-xs text-slate-400">
          Photographiez la pièce pour pré-remplir les champs (nom, prénoms, date de naissance, N° de pièce, NNI). La
          reconnaissance (OCR / ONECI) est <strong>simulée</strong> dans ce prototype. Choisissez une pièce de
          démonstration :
        </p>
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map((p) => (
            <button
              key={p.cni}
              onClick={() => scannerPiece(p)}
              disabled={!!demande}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-pass-blue hover:bg-pass-blue-light disabled:opacity-40"
            >
              <IdCard size={13} /> {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={scannerCmu} disabled={!!demande || !pieceScan} className="btn-ghost !py-2 text-sm">
            <ScanLine size={15} /> Scanner la carte CMU
          </button>
          <label className="btn-ghost !py-2 text-sm cursor-pointer">
            <Camera size={15} /> Photo pièce (CNI)
            <input type="file" accept="image/*" className="hidden" onChange={(e) => lireImage(e, setPiecePhoto)} disabled={!!demande} />
          </label>
          <label className="btn-ghost !py-2 text-sm cursor-pointer">
            <Camera size={15} /> Photo carte CMU
            <input type="file" accept="image/*" className="hidden" onChange={(e) => lireImage(e, setCmuPhoto)} disabled={!!demande} />
          </label>
        </div>
        {(pieceScan || cmuScan) && (
          <div className="flex flex-wrap items-center gap-3 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
            {pieceScan && <span>✓ Pièce d'identité lue (NNI {nni || "—"})</span>}
            {cmuScan && <span>✓ Carte CMU lue ({cmu})</span>}
            {piecePhoto && <span>✓ Photo CNI jointe</span>}
            {cmuPhoto && <span>✓ Photo CMU jointe</span>}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identité */}
        <div className="card p-5 lg:col-span-2 space-y-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <IdCard size={18} className="text-pass-blue" /> Identité du demandeur
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Numéro de pièce d'identité (CNI) *</label>
              <input className="field-input font-mono" value={cni} onChange={(e) => { startChrono(); setCni(e.target.value); }} disabled={!!demande} placeholder="CI-000-000000" />
            </div>
            <div>
              <label className="field-label">NNI (N° National d'Identification)</label>
              <input className="field-input font-mono" value={nni} onChange={(e) => setNni(e.target.value)} disabled={!!demande} placeholder="Lu automatiquement" />
            </div>
            <div>
              <label className="field-label">Nom *</label>
              <input className="field-input" value={nom} onChange={(e) => setNom(e.target.value)} disabled={!!demande} />
            </div>
            <div>
              <label className="field-label">Prénoms *</label>
              <input className="field-input" value={prenoms} onChange={(e) => setPrenoms(e.target.value)} disabled={!!demande} />
            </div>
            <div>
              <label className="field-label">Date de naissance *</label>
              <input type="date" className="field-input" value={dn} onChange={(e) => setDn(e.target.value)} disabled={!!demande} />
            </div>
            <div>
              <label className="field-label">Zone de résidence *</label>
              <input className="field-input" value={zone} onChange={(e) => setZone(e.target.value)} disabled={!!demande} placeholder="Ex. Korhogo" />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">N° carte CMU (éligibilité sociale)</label>
              <input className="field-input font-mono" value={cmu} onChange={(e) => setCmu(e.target.value)} disabled={!!demande} placeholder="Lu via la carte CMU (optionnel)" />
            </div>
          </div>

          {!demande && (
            <button onClick={verifierIdentite} className="btn-primary" disabled={busy || !champsComplets}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              Vérifier l'identité et créer le dossier
            </button>
          )}

          {demande && identite && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-700">Vérification d'identité (ONECI)</span>
                <SimuleBadge />
              </div>
              <div className="flex items-center gap-2">
                <ResultatIcon resultat={identite} />
                <span className="text-sm text-slate-600">{LIBELLE_RESULTAT[identite]}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Dossier n° <strong className="font-mono">{demande.numero_dossier}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Photo */}
        <div className="card p-5 space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Camera size={18} className="text-pass-blue" /> Photo
          </h2>
          <div className="aspect-square w-full overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 grid place-items-center">
            {photo ? (
              <img src={photo} alt="Photo du demandeur" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-slate-400 text-center px-4">Aucune photo</span>
            )}
          </div>
          <label className="btn-ghost w-full cursor-pointer">
            <Camera size={16} /> {photo ? "Changer" : "Ajouter une photo"}
            <input type="file" accept="image/*" className="hidden" onChange={onPhoto} disabled={!!demande} />
          </label>
        </div>
      </div>

      {/* Consentement */}
      {demande && (
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold">Consentement du bénéficiaire</h2>
          <div>
            <label className="field-label">Moyen de recueil</label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { v: "signature", l: "Signature" },
                  { v: "assiste_temoin", l: "Assisté avec témoin" },
                  { v: "otp", l: "Code OTP" },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  onClick={() => setMoyen(o.v)}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    moyen === o.v ? "border-pass-blue bg-pass-blue-light font-semibold text-pass-blue" : "border-slate-300"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              « Assisté avec témoin » convient aux bénéficiaires ne pouvant lire, écrire ou signer.
            </p>
          </div>

          {/* Capture selon le moyen choisi */}
          {moyen === "signature" && (
            <div>
              <label className="field-label">Signature du bénéficiaire</label>
              <SignaturePad ref={sigRef} />
              <button
                type="button"
                onClick={() => sigRef.current?.clear()}
                className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-pass-blue"
              >
                <Eraser size={12} /> Effacer
              </button>
            </div>
          )}
          {moyen === "assiste_temoin" && (
            <div>
              <label className="field-label">Nom et qualité du témoin</label>
              <input
                className="field-input"
                value={temoin}
                onChange={(e) => setTemoin(e.target.value)}
                placeholder="Ex. KOUAKOU Jean, agent communautaire"
              />
              <p className="mt-1 text-xs text-slate-400">
                Le bénéficiaire ne signe pas : le témoin atteste du recueil du consentement (public analphabète).
              </p>
            </div>
          )}
          {moyen === "otp" && (
            <div>
              <label className="field-label">Code de confirmation (OTP)</label>
              <input
                className="field-input w-40 font-mono tracking-[0.4em]"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="______"
                maxLength={6}
              />
              <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                Code envoyé au contact du bénéficiaire <SimuleBadge />
              </p>
            </div>
          )}

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              Le consentement libre et éclairé du bénéficiaire a été recueilli pour le traitement de ses données dans le
              cadre du programme PASS. <span className="text-red-600">*</span> (RM-184)
            </span>
          </label>

          <div className="border-t border-slate-100 pt-4">
            <label className="field-label">Contact pour la notification de retrait</label>
            <p className="text-xs text-slate-400 mb-2">
              Le bénéficiaire ne possède pas forcément de smartphone. Indiquez un canal joignable ; à défaut, une
              convocation papier lui sera remise.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                className="field-input"
                value={contactRelation}
                onChange={(e) => setContactRelation(e.target.value)}
              >
                <option value="menage">Téléphone du ménage</option>
                <option value="proche">Un proche</option>
                <option value="soi_meme">Bénéficiaire (déjà équipé)</option>
                <option value="relais">Relais communautaire</option>
                <option value="aucun">Aucun contact — convocation papier</option>
              </select>
              {contactRelation !== "aucun" && (
                <input
                  className="field-input"
                  placeholder="+225 07 00 00 00 00"
                  value={contactTel}
                  onChange={(e) => setContactTel(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button onClick={() => enregistrer(false)} className="btn-ghost" disabled={busy}>
              Enregistrer le brouillon
            </button>
            <button onClick={() => enregistrer(true)} className="btn-primary" disabled={busy || !consent}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Soumettre le dossier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
