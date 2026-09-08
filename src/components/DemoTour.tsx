import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, SkipForward, SkipBack, X, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { construireScenario, type EtapeDemo } from "../lib/demoScenario";

const CREDS = { email: "superviseur@pass.demo", password: "passdemo2026" };

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

export function DemoTour() {
  const nav = useNavigate();
  const { agent, signIn } = useAuth();
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [steps, setSteps] = useState<EtapeDemo[]>([]);
  const tokenRef = useRef(0);

  const arreter = useCallback(() => {
    setActive(false); setPaused(false); setIdx(0);
    tokenRef.current++;
    window.speechSynthesis?.cancel();
    document.querySelectorAll(".demo-highlight").forEach((e) => e.classList.remove("demo-highlight"));
  }, []);

  // Démarrage (auto-login superviseur si nécessaire)
  useEffect(() => {
    const handler = async () => {
      const { data } = await supabase.from("demande").select("id_demande").limit(1).maybeSingle();
      const id = (data as { id_demande: string } | null)?.id_demande ?? null;
      setSteps(construireScenario(id));
      setIdx(0); setPaused(false); setActive(true);
      if (!agent) { try { await signIn(CREDS.email, CREDS.password); } catch { /* ignore */ } }
    };
    window.addEventListener("pass:demo", handler);
    // précharge les voix
    window.speechSynthesis?.getVoices();
    return () => window.removeEventListener("pass:demo", handler);
  }, [agent, signIn]);

  const avancer = useCallback((token: number) => {
    if (token !== tokenRef.current) return;
    tokenRef.current++;
    setIdx((i) => {
      if (i >= steps.length - 1) { setTimeout(arreter, 400); return i; }
      return i + 1;
    });
  }, [steps.length, arreter]);

  // Déroulé d'une étape : navigation → surlignage → narration → étape suivante
  useEffect(() => {
    if (!active || paused || !steps.length || !agent) return;
    tokenRef.current++;
    const token = tokenRef.current;
    const step = steps[idx];
    nav(step.route);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const t = window.setTimeout(() => {
      if (token !== tokenRef.current) return;
      // surlignage
      document.querySelectorAll(".demo-highlight").forEach((e) => e.classList.remove("demo-highlight"));
      if (step.highlight) {
        const el = document.querySelector(step.highlight);
        if (el) { el.classList.add("demo-highlight"); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
      }
      // narration
      const fallbackMs = Math.min(14000, Math.max(4500, step.texte.length * 62));
      const done = () => avancer(token);
      const synth = window.speechSynthesis;
      if (muted || !synth) { window.setTimeout(done, fallbackMs); return; }
      synth.cancel();
      const u = new SpeechSynthesisUtterance(step.texte);
      u.lang = "fr-FR"; u.rate = 1; u.pitch = 1;
      const v = voixFr(); if (v) u.voice = v;
      u.onend = done;
      u.onerror = () => window.setTimeout(done, 1200);
      synth.speak(u);
      // filet de sécurité si onend ne se déclenche pas
      window.setTimeout(() => { if (token === tokenRef.current) done(); }, fallbackMs + 4000);
    }, 800);

    return () => window.clearTimeout(t);
  }, [active, paused, steps, idx, agent, muted, nav, avancer]);

  if (!active) return null;
  const step = steps[idx];

  return (
    <>
      <style>{`.demo-highlight{outline:3px solid #F08224;outline-offset:4px;border-radius:14px;box-shadow:0 0 0 6px rgba(240,130,36,.15);transition:outline .2s}`}</style>
      <div className="no-print fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-3xl rounded-2xl bg-pass-blue-dark text-white shadow-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-2.5 text-[11px] text-blue-100/80">
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide text-pass-orange">
              ● Mode démonstration
            </span>
            <span className="ml-auto tabular-nums">{idx + 1} / {steps.length}</span>
          </div>
          <div className="px-4 pb-1">
            <div className="font-bold text-[15px]">{step?.titre}</div>
            <p className="text-[13.5px] text-blue-50/90 mt-0.5 leading-snug">{step?.texte}</p>
          </div>
          <div className="flex items-center gap-1 px-3 py-2 bg-black/15">
            <button onClick={() => { tokenRef.current++; setIdx((i) => Math.max(0, i - 1)); }} className="p-2 rounded-lg hover:bg-white/10" title="Précédent"><SkipBack size={17} /></button>
            <button onClick={() => setPaused((p) => !p)} className="p-2 rounded-lg hover:bg-white/10" title={paused ? "Reprendre" : "Pause"}>{paused ? <Play size={17} /> : <Pause size={17} />}</button>
            <button onClick={() => { window.speechSynthesis?.cancel(); tokenRef.current++; setIdx((i) => Math.min(steps.length - 1, i + 1)); }} className="p-2 rounded-lg hover:bg-white/10" title="Suivant"><SkipForward size={17} /></button>
            <button onClick={() => setMuted((m) => { if (!m) window.speechSynthesis?.cancel(); return !m; })} className="p-2 rounded-lg hover:bg-white/10" title={muted ? "Activer la voix" : "Couper la voix"}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
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
