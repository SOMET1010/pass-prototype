import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, SkipForward, SkipBack, X, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { construireScenario, type EtapeDemo } from "../lib/demoScenario";

const CREDS = { email: "superviseur@pass.demo", password: "passdemo2026" };

type NarrationMode = "gpt" | "browser" | "muted" | "loading";

type GptVoiceResponse = {
  audio_base64?: string;
  media_type?: string;
  provider?: string;
  ai_generated?: boolean;
};

const audioCache = new Map<string, string>();

/** Déclenche la démonstration depuis n'importe où (bouton flottant, page de connexion). */
export function lancerDemo() {
  window.dispatchEvent(new Event("pass:demo"));
}

function voixFr(): SpeechSynthesisVoice | null {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const vs = synth.getVoices();
  return vs.find((v) => /fr(-|_)?/i.test(v.lang)) ?? vs[0] ?? null;
}

function decoderAudio(base64: string, mediaType: string): string {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mediaType }));
}

async function obtenirVoixGpt(texte: string): Promise<string> {
  const cached = audioCache.get(texte);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke<GptVoiceResponse>("gpt-voice", {
    body: { text: texte },
  });
  if (error || !data?.audio_base64) {
    throw error ?? new Error("Réponse audio GPT invalide");
  }

  const url = decoderAudio(data.audio_base64, data.media_type ?? "audio/mpeg");
  audioCache.set(texte, url);
  return url;
}

export function DemoTour() {
  const nav = useNavigate();
  const { agent, signIn } = useAuth();
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [steps, setSteps] = useState<EtapeDemo[]>([]);
  const [narrationMode, setNarrationMode] = useState<NarrationMode>("loading");
  const tokenRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const couperNarration = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
  }, []);

  const arreter = useCallback(() => {
    setActive(false); setPaused(false); setIdx(0);
    tokenRef.current++;
    couperNarration();
    document.querySelectorAll(".demo-highlight").forEach((e) => e.classList.remove("demo-highlight"));
  }, [couperNarration]);

  // Démarrage (auto-login superviseur si nécessaire)
  useEffect(() => {
    const handler = async () => {
      const { data } = await supabase.from("demande").select("id_demande").limit(1).maybeSingle();
      const id = (data as { id_demande: string } | null)?.id_demande ?? null;
      setSteps(construireScenario(id));
      setIdx(0); setPaused(false); setActive(true); setNarrationMode("loading");
      if (!agent) { try { await signIn(CREDS.email, CREDS.password); } catch { /* ignore */ } }
    };
    window.addEventListener("pass:demo", handler);
    // Précharge les voix de secours du navigateur.
    window.speechSynthesis?.getVoices();
    return () => window.removeEventListener("pass:demo", handler);
  }, [agent, signIn]);

  const avancer = useCallback((token: number) => {
    if (token !== tokenRef.current) return;
    tokenRef.current++;
    setIdx((i) => {
      if (i >= steps.length - 1) { window.setTimeout(arreter, 400); return i; }
      return i + 1;
    });
  }, [steps.length, arreter]);

  // Déroulé d'une étape : navigation → surlignage → voix GPT → étape suivante.
  // Si l'API GPT est indisponible, la synthèse du navigateur prend le relais.
  useEffect(() => {
    if (!active || paused || !steps.length || !agent) return;
    tokenRef.current++;
    const token = tokenRef.current;
    const step = steps[idx];
    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      const timer = window.setTimeout(fn, ms);
      timers.push(timer);
      return timer;
    };

    nav(step.route);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const done = () => {
      if (!cancelled && token === tokenRef.current) avancer(token);
    };

    const parlerAvecNavigateur = (fallbackMs: number) => {
      if (cancelled || token !== tokenRef.current) return;
      const synth = window.speechSynthesis;
      if (!synth) {
        setNarrationMode("muted");
        later(done, fallbackMs);
        return;
      }

      setNarrationMode("browser");
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(step.texte);
      utterance.lang = "fr-FR";
      utterance.rate = 1;
      utterance.pitch = 1;
      const voice = voixFr();
      if (voice) utterance.voice = voice;
      utterance.onend = done;
      utterance.onerror = () => later(done, 1200);
      synth.speak(utterance);
      later(done, fallbackMs + 4000);
    };

    const timer = window.setTimeout(() => {
      if (cancelled || token !== tokenRef.current) return;

      document.querySelectorAll(".demo-highlight").forEach((e) => e.classList.remove("demo-highlight"));
      if (step.highlight) {
        const el = document.querySelector(step.highlight);
        if (el) {
          el.classList.add("demo-highlight");
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      const fallbackMs = Math.min(14000, Math.max(4500, step.texte.length * 62));
      if (muted) {
        setNarrationMode("muted");
        later(done, fallbackMs);
        return;
      }

      setNarrationMode("loading");
      void obtenirVoixGpt(step.texte)
        .then(async (src) => {
          if (cancelled || token !== tokenRef.current) return;
          const audio = new Audio(src);
          audioRef.current = audio;
          audio.onended = done;
          audio.onerror = () => parlerAvecNavigateur(fallbackMs);
          setNarrationMode("gpt");
          try {
            await audio.play();
            later(done, fallbackMs + 10000);
          } catch {
            parlerAvecNavigateur(fallbackMs);
          }
        })
        .catch(() => parlerAvecNavigateur(fallbackMs));
    }, 800);
    timers.push(timer);

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      couperNarration();
    };
  }, [active, paused, steps, idx, agent, muted, nav, avancer, couperNarration]);

  if (!active) return null;
  const step = steps[idx];

  const changerPause = () => {
    tokenRef.current++;
    couperNarration();
    setPaused((p) => !p);
  };

  const changerMuet = () => {
    tokenRef.current++;
    couperNarration();
    setMuted((m) => !m);
  };

  const allerA = (delta: number) => {
    tokenRef.current++;
    couperNarration();
    setIdx((i) => Math.max(0, Math.min(steps.length - 1, i + delta)));
  };

  const libelleVoix =
    narrationMode === "gpt" ? "Voix GPT · générée par IA" :
    narrationMode === "browser" ? "Voix navigateur · secours" :
    narrationMode === "muted" ? "Voix coupée" :
    "Préparation de la voix GPT…";

  return (
    <>
      <style>{`.demo-highlight{outline:3px solid #F08224;outline-offset:4px;border-radius:14px;box-shadow:0 0 0 6px rgba(240,130,36,.15);transition:outline .2s}`}</style>
      <div className="no-print fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-3xl rounded-2xl bg-pass-blue-dark text-white shadow-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-2.5 text-[11px] text-blue-100/80">
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide text-pass-orange">
              ● Mode démonstration
            </span>
            <span className="text-blue-100/70">· {libelleVoix}</span>
            <span className="ml-auto tabular-nums">{idx + 1} / {steps.length}</span>
          </div>
          <div className="px-4 pb-1">
            <div className="font-bold text-[15px]">{step?.titre}</div>
            <p className="text-[13.5px] text-blue-50/90 mt-0.5 leading-snug">{step?.texte}</p>
          </div>
          <div className="flex items-center gap-1 px-3 py-2 bg-black/15">
            <button onClick={() => allerA(-1)} className="p-2 rounded-lg hover:bg-white/10" title="Précédent"><SkipBack size={17} /></button>
            <button onClick={changerPause} className="p-2 rounded-lg hover:bg-white/10" title={paused ? "Reprendre" : "Pause"}>{paused ? <Play size={17} /> : <Pause size={17} />}</button>
            <button onClick={() => allerA(1)} className="p-2 rounded-lg hover:bg-white/10" title="Suivant"><SkipForward size={17} /></button>
            <button onClick={changerMuet} className="p-2 rounded-lg hover:bg-white/10" title={muted ? "Activer la voix" : "Couper la voix"}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-blue-100/70 hidden sm:inline">Démo guidée — données fictives</span>
              <button onClick={arreter} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm font-semibold" title="Arrêter"><X size={15} /> Arrêter</button>
            </div>
          </div>
          <div className="h-1 bg-white/10"><div className="h-full bg-pass-orange transition-all" style={{ width: `${((idx + 1) / steps.length) * 100}%` }} /></div>
        </div>
      </div>
    </>
  );
}
