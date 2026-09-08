// ============================================================================
// Voix de narration — synthèse vocale institutionnelle (Azure OpenAI TTS).
// Appelle l'Edge Function « ansut-voix » (qui détient la clé côté serveur) et
// renvoie une URL audio jouable. En cas d'indisponibilité (clé non fournie,
// erreur réseau…), renvoie null : l'appelant bascule sur la voix du navigateur
// (Web Speech API). Les audios sont mis en cache par texte pour éviter de
// régénérer — et de refacturer — un passage déjà entendu.
// ============================================================================
import { supabase } from "./supabase";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ansut-voix`;

// null = inconnu (jamais testé) ; true/false = résultat du dernier essai réel.
let disponible: boolean | null = null;
const cache = new Map<string, string>(); // texte -> objectURL

/** État connu de la voix Azure : null tant qu'aucun essai n'a abouti. */
export function voixInstitutionnelleDisponible(): boolean | null {
  return disponible;
}

/**
 * Synthétise `texte` via Azure OpenAI TTS.
 * @returns une URL audio (objectURL) à jouer, ou `null` s'il faut basculer
 *          sur la voix du navigateur.
 */
export async function synthetiserVoix(texte: string, signal?: AbortSignal): Promise<string | null> {
  const t = texte.trim();
  if (!t) return null;
  if (disponible === false) return null; // déjà constaté indisponible → repli direct
  const hit = cache.get(t);
  if (hit) return hit;

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null; // pas de session agent → repli

    const res = await fetch(FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ texte: t }),
      signal,
    });

    const ct = res.headers.get("content-type") ?? "";
    if (!res.ok || !ct.startsWith("audio/")) {
      disponible = false; // { configured:false } ou erreur → repli navigateur
      return null;
    }
    disponible = true;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    cache.set(t, objectUrl);
    return objectUrl;
  } catch {
    if (!signal?.aborted) disponible = false;
    return null;
  }
}

/** Pré-génère un passage en arrière-plan (remplit le cache) — sans erreur visible. */
export function prechargerVoix(texte: string): void {
  if (disponible === false) return;
  const t = texte.trim();
  if (!t || cache.has(t)) return;
  synthetiserVoix(t).catch(() => { /* silencieux */ });
}
