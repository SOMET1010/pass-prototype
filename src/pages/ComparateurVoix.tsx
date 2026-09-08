import { useRef, useState } from "react";
import { Loader2, Play, Volume2, Info } from "lucide-react";
import { supabase } from "../lib/supabase";
import { SimuleBadge } from "../components/Badges";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ansut-voix`;

const PASSAGE =
  "Bienvenue sur PASS, le Programme d'Accès aux Smartphones Subventionnés de l'ANSUT. " +
  "La vérification d'éligibilité sépare les contrôles de régularité, qui sont bloquants, " +
  "du score de priorité. Un refus ne vient jamais d'un score insuffisant.";

const VOIX = [
  { id: "sage", libelle: "Sage", note: "posée, sobre" },
  { id: "nova", libelle: "Nova", note: "claire, dynamique" },
  { id: "coral", libelle: "Coral", note: "chaleureuse, ronde" },
  { id: "alloy", libelle: "Alloy", note: "neutre (défaut actuel)" },
];

export function ComparateurVoix() {
  const [texte, setTexte] = useState(PASSAGE);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [prefere, setPrefere] = useState<string | null>(null);
  const cache = useRef<Map<string, string>>(new Map()); // clé `${voix}|${texte}` -> objectURL
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function jouer(voix: string) {
    setErr(null);
    audioRef.current?.pause();
    const cle = `${voix}|${texte}`;
    const dejaLa = cache.current.get(cle);
    if (dejaLa) { const a = new Audio(dejaLa); audioRef.current = a; a.play(); return; }
    setBusy(voix);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expirée — reconnectez-vous.");
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({ texte, voix }),
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!res.ok || !ct.startsWith("audio/")) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || j.error || `Réponse inattendue (${res.status}).`);
      }
      const url = URL.createObjectURL(await res.blob());
      cache.current.set(cle, url);
      const a = new Audio(url); audioRef.current = a; a.play();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur de génération.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-pass-blue-dark flex items-center gap-2">
          <Volume2 size={20} className="text-pass-blue" /> Comparateur de voix — narration
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Écoutez le même passage avec chaque voix Azure OpenAI (<code className="text-xs">gpt-4o-mini-tts</code>),
          puis choisissez celle de la démonstration. <SimuleBadge />
        </p>
      </div>

      <div className="card p-4 space-y-2">
        <label className="field-label">Passage à lire</label>
        <textarea
          className="field-input min-h-[90px] text-sm"
          value={texte}
          onChange={(e) => { setTexte(e.target.value); cache.current.clear(); }}
          maxLength={1200}
        />
        <p className="text-[11px] text-slate-400">{texte.length}/1200 caractères · modifier le texte réinitialise le cache audio.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {VOIX.map((v) => (
          <div key={v.id} className={`card p-4 flex items-center gap-3 ${prefere === v.id ? "ring-2 ring-pass-orange" : ""}`}>
            <button
              onClick={() => jouer(v.id)}
              disabled={busy !== null}
              className="btn-primary !px-3 !py-2 shrink-0"
              title={`Écouter la voix ${v.libelle}`}
            >
              {busy === v.id ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm">{v.libelle} <span className="font-normal text-slate-400">· {v.note}</span></div>
              <button
                onClick={() => setPrefere(v.id)}
                className={`text-[11px] font-medium ${prefere === v.id ? "text-pass-orange" : "text-slate-400 hover:text-pass-blue"}`}
              >
                {prefere === v.id ? "✓ Choix préféré" : "Marquer comme préféré"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {err && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</div>}

      {prefere && (
        <div className="rounded-lg bg-pass-blue-light border border-pass-blue/20 px-4 py-3 text-sm text-slate-700 flex items-start gap-2">
          <Info size={16} className="text-pass-blue shrink-0 mt-0.5" />
          <span>
            Voix préférée : <strong>{VOIX.find((v) => v.id === prefere)?.libelle}</strong>. Pour la rendre permanente,
            poser le secret <code className="text-xs">AZURE_OPENAI_TTS_VOICE = {prefere}</code> (Edge Functions → Secrets)
            — aucun redéploiement nécessaire.
          </span>
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        La clé Azure reste côté serveur (Edge Function). Chaque voix n'est générée qu'une fois par passage puis mise en cache.
      </p>
    </div>
  );
}
