import { useEffect, useState } from "react";
import { MessageCircle, HeartPulse, GraduationCap, Briefcase, Landmark, MoreHorizontal, Check } from "lucide-react";
import { lireProfilUsage, majProfilUsage } from "../lib/eligibilite";
import { toast } from "./Toaster";

const OPTIONS = [
  { code: "communication", label: "Rester en contact", icon: MessageCircle },
  { code: "sante", label: "Santé / urgences", icon: HeartPulse },
  { code: "education", label: "École / apprendre", icon: GraduationCap },
  { code: "activite", label: "Mon activité", icon: Briefcase },
  { code: "demarches", label: "Démarches / services", icon: Landmark },
  { code: "autre", label: "Autre", icon: MoreHorizontal },
];

/**
 * Profil d'usage déclaratif (CDC v3 §3.4) — recueilli APRÈS l'attribution.
 * Question unique, facultative, modifiable. Stocké dans une base séparée :
 * n'alimente jamais le score, les quotas ou la décision.
 */
export function ProfilUsage({ idPersonne }: { idPersonne: string }) {
  const [choix, setChoix] = useState<string | null>(null);
  const [autre, setAutre] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    lireProfilUsage(idPersonne).then((p) => {
      if (p) { setChoix(p.usage_principal); setAutre(p.autre_texte ?? ""); setSaved(true); }
    });
  }, [idPersonne]);

  async function choisir(code: string) {
    setChoix(code); setSaved(false);
    if (code !== "autre") await enregistrer(code, null);
  }
  async function enregistrer(code: string, autreTxt: string | null) {
    try { await majProfilUsage(idPersonne, code, autreTxt); setSaved(true); toast("Merci, c'est noté.", "success"); }
    catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
  }

  return (
    <div className="no-print rounded-lg border border-pass-blue/20 bg-pass-blue-light/30 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-pass-blue-dark">
        <MessageCircle size={16} /> À quoi souhaitez-vous surtout utiliser ce téléphone ?
        <span className="ml-auto text-[10px] font-normal text-slate-400">facultatif</span>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const on = choix === o.code;
          return (
            <button key={o.code} onClick={() => choisir(o.code)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                on ? "border-pass-blue bg-white text-pass-blue-dark font-semibold" : "border-slate-200 bg-white/60 text-slate-600 hover:border-pass-blue/50"}`}>
              <o.icon size={16} className={on ? "text-pass-blue" : "text-slate-400"} /> {o.label}
              {on && <Check size={14} className="ml-auto text-emerald-600" />}
            </button>
          );
        })}
      </div>
      {choix === "autre" && (
        <div className="mt-2 flex gap-2">
          <input className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Précisez (facultatif)"
            value={autre} onChange={(e) => setAutre(e.target.value)} />
          <button className="btn-primary text-sm" onClick={() => enregistrer("autre", autre || null)}>Enregistrer</button>
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-500">
        {saved ? "Réponse enregistrée — modifiable à tout moment. " : ""}
        Cette information est conservée séparément et n'entre <strong>jamais</strong> dans le calcul d'éligibilité, le score ou les quotas (CDC v3 §3.4).
      </p>
    </div>
  );
}
