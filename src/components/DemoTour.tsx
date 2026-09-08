import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, SkipForward, SkipBack, X, Volume2, VolumeX, MousePointer2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { construireScenario, type EtapeDemo, type DemoAction } from "../lib/demoScenario";
import { synthetiserVoix, prechargerVoix, voixInstitutionnelleDisponible } from "../lib/voix";

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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Renseigne une valeur sur un champ contrôlé par React (input/select) et notifie React. */
function setReactValue(el: HTMLElement, value: string) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function DemoTour() {
  const nav = useNavigate();
  const { agent, signIn } = useAuth();
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [steps, setSteps] = useState<EtapeDemo[]>([]);
  const [voixAzure, setVoixAzure] = useState<boolean | null>(voixInstitutionnelleDisponible());
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean; clicking: boolean }>(
    { x: -100, y: -100, visible: false, clicking: false }
  );
  const [action, setAction] = useState<string | null>(null); // libellé de l'action en cours
  const tokenRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const couperAudio = useCallback(() => {
    window.speechSynthesis?.cancel();
    const a = audioRef.current;
    if (a) { a.pause(); a.onended = null; a.onerror = null; audioRef.current = null; }
  }, []);

  const arreter = useCallback(() => {
    setActive(false); setPaused(false); setIdx(0);
    tokenRef.current++;
    couperAudio();
    setCursor((c) => ({ ...c, visible: false }));
    setAction(null);
    document.querySelectorAll(".demo-highlight").forEach((e) => e.classList.remove("demo-highlight"));
  }, [couperAudio]);

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

  // --- Moteur d'actions « agent » -------------------------------------------
  const attendreElement = useCallback(async (selector: string, token: number): Promise<HTMLElement | null> => {
    for (let i = 0; i < 40; i++) {
      if (token !== tokenRef.current) return null;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) return el;
      await sleep(100);
    }
    return null;
  }, []);

  const deplacerCurseurVers = useCallback(async (el: HTMLElement, token: number) => {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep(500);
    if (token !== tokenRef.current) return;
    const r = el.getBoundingClientRect();
    setCursor({ x: r.left + r.width / 2, y: r.top + r.height / 2, visible: true, clicking: false });
    await sleep(700); // temps de déplacement (transition CSS)
  }, []);

  const clignerClic = useCallback(async () => {
    setCursor((c) => ({ ...c, clicking: true }));
    await sleep(220);
    setCursor((c) => ({ ...c, clicking: false }));
    await sleep(120);
  }, []);

  const executerActions = useCallback(async (actions: DemoAction[] | undefined, token: number) => {
    if (!actions?.length) return;
    for (const a of actions) {
      if (token !== tokenRef.current) return;
      if (a.type === "wait") { await sleep(a.ms); continue; }
      const el = await attendreElement(a.selector, token);
      if (!el || token !== tokenRef.current) continue;
      setAction(a.note ?? null);
      await deplacerCurseurVers(el, token);
      if (token !== tokenRef.current) return;
      await clignerClic();
      if (token !== tokenRef.current) return;
      if (a.type === "click") {
        el.click();
      } else if (a.type === "select" || a.type === "fill") {
        setReactValue(el, a.value);
      } else if (a.type === "type") {
        const input = el as HTMLInputElement;
        input.focus();
        // Les champs date/nombre n'acceptent pas de valeur partielle → pose directe.
        if (input.type === "date" || input.type === "number") {
          setReactValue(input, a.value);
        } else {
          for (let i = 1; i <= a.value.length; i++) {
            if (token !== tokenRef.current) return;
            setReactValue(input, a.value.slice(0, i));
            await sleep(60); // frappe caractère par caractère
          }
        }
      }
    }
    setAction(null);
  }, [attendreElement, deplacerCurseurVers, clignerClic]);

  // --- Narration (voix institutionnelle Azure, repli navigateur) ------------
  const narrer = useCallback(async (step: EtapeDemo, token: number) => {
    const fallbackMs = Math.min(15000, Math.max(4500, step.texte.length * 62));
    if (muted) { await sleep(fallbackMs); return; }
    const src = await synthetiserVoix(step.texte).catch(() => null);
    if (token !== tokenRef.current) return;
    setVoixAzure(voixInstitutionnelleDisponible());
    if (src) {
      await new Promise<void>((resolve) => {
        couperAudio();
        const audio = new Audio(src);
        audioRef.current = audio;
        let fini = false;
        const done = () => { if (!fini) { fini = true; resolve(); } };
        audio.onended = done;
        audio.onerror = () => setTimeout(done, 800);
        audio.play().catch(() => setTimeout(done, 800));
        setTimeout(done, fallbackMs + 20000); // filet de sécurité
      });
      return;
    }
    // Repli : voix du navigateur
    const synth = window.speechSynthesis;
    if (!synth) { await sleep(fallbackMs); return; }
    await new Promise<void>((resolve) => {
      synth.cancel();
      let fini = false;
      const done = () => { if (!fini) { fini = true; resolve(); } };
      const u = new SpeechSynthesisUtterance(step.texte);
      u.lang = "fr-FR"; u.rate = 1; u.pitch = 1;
      const v = voixFr(); if (v) u.voice = v;
      u.onend = done;
      u.onerror = () => setTimeout(done, 800);
      synth.speak(u);
      setTimeout(done, fallbackMs + 4000);
    });
  }, [muted, couperAudio]);

  // Déroulé d'une étape : navigation → (surlignage + narration + actions en parallèle) → étape suivante
  useEffect(() => {
    if (!active || paused || !steps.length || !agent) return;
    tokenRef.current++;
    const token = tokenRef.current;
    const step = steps[idx];
    nav(step.route);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCursor((c) => ({ ...c, visible: false }));
    setAction(null);

    (async () => {
      await sleep(850);
      if (token !== tokenRef.current) return;
      document.querySelectorAll(".demo-highlight").forEach((e) => e.classList.remove("demo-highlight"));
      if (step.highlight) {
        const el = document.querySelector(step.highlight);
        if (el) { el.classList.add("demo-highlight"); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
      }
      if (idx < steps.length - 1) prechargerVoix(steps[idx + 1].texte);

      // narration ET actions en même temps : l'étape avance quand les deux sont finies
      await Promise.race([
        Promise.all([narrer(step, token), executerActions(step.actions, token)]),
        sleep(60000),
      ]);
      if (token === tokenRef.current) { setCursor((c) => ({ ...c, visible: false })); avancer(token); }
    })();

    return () => { /* le garde par token neutralise la boucle async précédente */ };
  }, [active, paused, steps, idx, agent, nav, avancer, narrer, executerActions]);

  if (!active) return null;
  const step = steps[idx];

  return (
    <>
      <style>{`
        .demo-highlight{outline:3px solid #F08224;outline-offset:4px;border-radius:14px;box-shadow:0 0 0 6px rgba(240,130,36,.15);transition:outline .2s}
        .demo-cursor{position:fixed;z-index:70;pointer-events:none;transition:left .65s cubic-bezier(.22,.61,.36,1),top .65s cubic-bezier(.22,.61,.36,1),transform .15s ease;transform:translate(-3px,-2px)}
        .demo-cursor.click{transform:translate(-3px,-2px) scale(.8)}
        .demo-cursor .ring{position:absolute;left:-10px;top:-10px;width:34px;height:34px;border-radius:9999px;border:3px solid #F08224;opacity:0;transform:scale(.4)}
        .demo-cursor.click .ring{animation:demo-ping .5s ease-out}
        @keyframes demo-ping{0%{opacity:.7;transform:scale(.4)}100%{opacity:0;transform:scale(1.4)}}
      `}</style>

      {/* Curseur de l'agent */}
      {cursor.visible && (
        <div className={`demo-cursor no-print ${cursor.clicking ? "click" : ""}`} style={{ left: cursor.x, top: cursor.y }}>
          <span className="ring" />
          <MousePointer2 size={26} className="text-pass-orange drop-shadow-[0_1px_2px_rgba(0,0,0,.35)]" fill="#F08224" />
        </div>
      )}

      <div className="no-print fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-3xl rounded-2xl bg-pass-blue-dark text-white shadow-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-2.5 text-[11px] text-blue-100/80">
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide text-pass-orange">
              ● Mode démonstration
            </span>
            {voixAzure === true && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-blue-50">
                <Volume2 size={11} /> Voix institutionnelle
              </span>
            )}
            {action && (
              <span className="inline-flex items-center gap-1 rounded-full bg-pass-orange/25 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-amber-100">
                <MousePointer2 size={11} /> {action}
              </span>
            )}
            <span className="ml-auto tabular-nums">{idx + 1} / {steps.length}</span>
          </div>
          <div className="px-4 pb-1">
            <div className="font-bold text-[15px]">{step?.titre}</div>
            <p className="text-[13.5px] text-blue-50/90 mt-0.5 leading-snug">{step?.texte}</p>
          </div>
          <div className="flex items-center gap-1 px-3 py-2 bg-black/15">
            <button onClick={() => { couperAudio(); setCursor((c) => ({ ...c, visible: false })); tokenRef.current++; setIdx((i) => Math.max(0, i - 1)); }} className="p-2 rounded-lg hover:bg-white/10" title="Précédent"><SkipBack size={17} /></button>
            <button onClick={() => setPaused((p) => { if (!p) { couperAudio(); setCursor((c) => ({ ...c, visible: false })); } return !p; })} className="p-2 rounded-lg hover:bg-white/10" title={paused ? "Reprendre" : "Pause"}>{paused ? <Play size={17} /> : <Pause size={17} />}</button>
            <button onClick={() => { couperAudio(); setCursor((c) => ({ ...c, visible: false })); tokenRef.current++; setIdx((i) => Math.min(steps.length - 1, i + 1)); }} className="p-2 rounded-lg hover:bg-white/10" title="Suivant"><SkipForward size={17} /></button>
            <button onClick={() => setMuted((m) => { if (!m) couperAudio(); return !m; })} className="p-2 rounded-lg hover:bg-white/10" title={muted ? "Activer la voix" : "Couper la voix"}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
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
