// ============================================================================
// Edge Function « ansut-voix »
// Passerelle de synthèse vocale (narration de la démonstration PASS).
// Détient la clé Azure OpenAI côté serveur — JAMAIS exposée au navigateur —
// appelle le déploiement TTS (gpt-4o-mini-tts) et renvoie l'audio au frontend.
// En l'absence de la clé, répond { configured: false } (200) : le frontend
// bascule proprement sur la voix du navigateur (Web Speech API). Le parcours
// n'est jamais bloqué.
//
// Accès réservé à un agent authentifié (JWT valide) — évite tout abus de coût.
//
// Secrets attendus (Project Settings → Edge Functions → Secrets) :
//   AZURE_OPENAI_TTS_KEY          (requis — la clé API Azure ; alias : AZURE_OPENAI_API_KEY)
//   AZURE_OPENAI_TTS_ENDPOINT     (option — défaut : ressource DTDI ; alias : AZURE_OPENAI_ENDPOINT)
//   AZURE_OPENAI_TTS_DEPLOYMENT   (option — défaut : gpt-4o-mini-tts)
//   AZURE_OPENAI_TTS_API_VERSION  (option — défaut : 2025-03-01-preview)
//   AZURE_OPENAI_TTS_VOICE        (option — défaut : alloy)
//   AZURE_OPENAI_TTS_INSTRUCTIONS (option — ton de la narration)
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_ENDPOINT = "https://dtdi-openai-audio-02.openai.azure.com/";
const DEFAULT_DEPLOYMENT = "gpt-4o-mini-tts";
const DEFAULT_API_VERSION = "2025-03-01-preview";
const DEFAULT_VOICE = "alloy";
const DEFAULT_INSTRUCTIONS =
  "Voix de narration institutionnelle en français de Côte d'Ivoire, posée, claire et bienveillante ; rythme mesuré, articulation nette, ton professionnel et rassurant.";
const MAX_LEN = 1200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({}));
    const texte = String(body?.texte ?? "").trim();
    if (!texte) return json({ error: "texte requis" }, 400);
    if (texte.length > MAX_LEN) return json({ error: `texte trop long (max ${MAX_LEN})` }, 400);

    // Habilitation : JWT d'agent valide requis (aucun accès anonyme).
    const url = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const asAgent = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await asAgent.auth.getUser();
    if (authErr || !userData?.user) return json({ error: "Accès refusé : agent non authentifié." }, 401);

    // Accepte les deux conventions de nommage du secret (TTS dédié ou générique Azure OpenAI).
    const key = Deno.env.get("AZURE_OPENAI_TTS_KEY") ?? Deno.env.get("AZURE_OPENAI_API_KEY");
    if (!key) {
      // Non configuré → repli navigateur côté frontend (pas une erreur).
      return json({ configured: false, detail: "Clé Azure OpenAI TTS non fournie sur cet environnement." });
    }

    // Endpoint : secret dédié TTS en priorité, sinon la ressource DTDI de référence
    // (audio-02, où vit le déploiement). On n'utilise PAS le secret générique
    // AZURE_OPENAI_ENDPOINT : il peut pointer une autre ressource que la clé.
    const endpoint = (Deno.env.get("AZURE_OPENAI_TTS_ENDPOINT") ?? DEFAULT_ENDPOINT).replace(/\/+$/, "");
    const deployment = Deno.env.get("AZURE_OPENAI_TTS_DEPLOYMENT") ?? DEFAULT_DEPLOYMENT;
    const apiVersion = Deno.env.get("AZURE_OPENAI_TTS_API_VERSION") ?? DEFAULT_API_VERSION;
    const voix = String(body?.voix ?? Deno.env.get("AZURE_OPENAI_TTS_VOICE") ?? DEFAULT_VOICE);
    const instructions = String(body?.instructions ?? Deno.env.get("AZURE_OPENAI_TTS_INSTRUCTIONS") ?? DEFAULT_INSTRUCTIONS);

    const azUrl = `${endpoint}/openai/deployments/${deployment}/audio/speech?api-version=${apiVersion}`;
    const res = await fetch(azUrl, {
      method: "POST",
      headers: { "api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: deployment,
        input: texte,
        voice: voix,
        instructions,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 500);
      return json({ error: `Azure OpenAI TTS ${res.status}`, detail }, 502);
    }

    const audio = await res.arrayBuffer();

    // Option { format:"base64" } : renvoie l'audio encodé en JSON (utile pour les
    // clients qui ne peuvent pas manipuler un flux binaire). Défaut = binaire.
    if (String(body?.format ?? "") === "base64") {
      let bin = "";
      const bytes = new Uint8Array(audio);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return json({ voix, octets: bytes.length, audio_base64: btoa(bin) });
    }

    return new Response(audio, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
