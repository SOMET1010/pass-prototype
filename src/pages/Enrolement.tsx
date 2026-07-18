import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, IdCard, Camera, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fichierVersDataUrl } from "../lib/image";
import { toast } from "../components/Toaster";
import { SimuleBadge, ResultatIcon } from "../components/Badges";
import { LIBELLE_RESULTAT } from "../lib/rules";
import type { Campagne, Demande, ResultatVerif, MoyenConsentement } from "../lib/types";

const PERSONAS = [
  { label: "Mariam KOUASSI", nom: "KOUASSI", prenoms: "Mariam", cni: "CI-001-334455", dn: "1972-04-12", zone: "Korhogo" },
  { label: "Adama TRAORÉ", nom: "TRAORÉ", prenoms: "Adama", cni: "CI-002-778899", dn: "1994-09-03", zone: "Bouaké" },
  { label: "Awa DIALLO", nom: "DIALLO", prenoms: "Awa", cni: "CI-003-112233", dn: "1988-01-20", zone: "Man" },
  { label: "Koffi Yao", nom: "KOFFI YAO", prenoms: "N'GUESSAN", cni: "CI-004-556677", dn: "1965-11-30", zone: "Odienné" },
  { label: "Fatou COULIBALY", nom: "COULIBALY", prenoms: "Fatou", cni: "CI-005-990011", dn: "1970-06-15", zone: "Korhogo" },
];

export function Enrolement() {
  const navigate = useNavigate();
  const [campagne, setCampagne] = useState<Campagne | null>(null);

  const [cni, setCni] = useState("");
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [dn, setDn] = useState("");
  const [zone, setZone] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const [demande, setDemande] = useState<Demande | null>(null);
  const [identite, setIdentite] = useState<ResultatVerif | null>(null);
  const [moyen, setMoyen] = useState<MoyenConsentement>("signature");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

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

  function chargerPersona(p: (typeof PERSONAS)[number]) {
    setCni(p.cni);
    setNom(p.nom);
    setPrenoms(p.prenoms);
    setDn(p.dn);
    setZone(p.zone);
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhoto(await fichierVersDataUrl(file));
    } catch {
      toast("Impossible de lire l'image.", "error");
    }
  }

  async function verifierIdentite() {
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
    if (consent) {
      const { error } = await supabase.rpc("pass_enregistrer_consentement", {
        p_id_demande: demande.id_demande,
        p_moyen: moyen,
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
      const { error } = await supabase.rpc("pass_soumettre_demande", { p_id_demande: demande.id_demande });
      setBusy(false);
      if (error) return toast(error.message, "error");
      toast("Dossier soumis. Passage à la vérification.", "success");
      return navigate(`/verification/${demande.id_demande}`);
    }
    setBusy(false);
    toast("Brouillon enregistré (RM-063).", "success");
  }

  return (
    <div className="space-y-6">
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

      {/* Aide démo */}
      <div className="card p-3 flex flex-wrap items-center gap-2 bg-slate-50">
        <span className="text-xs font-semibold text-slate-500">Charger un persona&nbsp;:</span>
        {PERSONAS.map((p) => (
          <button
            key={p.cni}
            onClick={() => chargerPersona(p)}
            disabled={!!demande}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-pass-blue hover:bg-pass-blue-light disabled:opacity-40"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identité */}
        <div className="card p-5 lg:col-span-2 space-y-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <IdCard size={18} className="text-pass-blue" /> Identité du demandeur
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label">Numéro de pièce d'identité (CNI) *</label>
              <input className="field-input font-mono" value={cni} onChange={(e) => setCni(e.target.value)} disabled={!!demande} placeholder="CI-000-000000" />
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

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              Le consentement libre et éclairé du bénéficiaire a été recueilli pour le traitement de ses données dans le
              cadre du programme PASS. <span className="text-red-600">*</span> (RM-184)
            </span>
          </label>

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
