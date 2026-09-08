// ============================================================================
// Edge Function « gpt-voice »
// Génère la narration officielle du mode Démonstration avec OpenAI TTS.
// La clé OPENAI_API_KEY reste exclusivement côté serveur.
// Seuls les dix textes figés du parcours sont acceptés afin d'éviter qu'un
// compte de démonstration public ne transforme cette fonction en TTS générique.
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NARRATIONS = new Set([
  "Bienvenue sur la plateforme PASS, le Programme d'Accès aux Smartphones Subventionnés de l'ANSUT. Voici le tableau de bord : la mission, les indicateurs du jour et le parcours du bénéficiaire.",
  "Première étape : l'enrôlement. L'agent scanne les pièces disponibles, le dossier se pré-remplit, et le consentement est recueilli. L'objectif est de rester sous une minute.",
  "La vérification d'éligibilité. Les contrôles de régularité, bloquants, sont séparés du score sur cinq dimensions, qui produit un rang de priorité de P1 à P4. Chaque décision est figée dans un cachet reproductible : elle reste défendable des mois plus tard.",
  "Le simulateur permet de tester une situation sans créer de dossier. Le rang se recalcule en direct, selon les paramètres en vigueur : idéal pour la formation et pour mesurer l'effet d'un réglage.",
  "Ici, les poids et les seuils sont administrables, versionnés et horodatés : rien n'est codé en dur. Les modes d'accès aux registres nationaux sont également configurables, source par source.",
  "Le ciblage géographique applique trois filtres, un score de priorisation, puis répartit les quotas. Les localités rurales défavorisées sont priorisées, avec une réserve d'arbitrage toujours motivée et tracée.",
  "La chaîne logistique complète : de la commande au fournisseur jusqu'à la mission de terrain, en passant par la réception, l'entrepôt et les points mobiles — chaque terminal étant tracé par son IMEI.",
  "La cartographie des points de retrait et l'état des stocks par centre, avec les seuils d'alerte de réapprovisionnement.",
  "La supervision suit les délais de service, un journal d'audit inaltérable et la conformité du programme.",
  "Voilà la plateforme PASS : un parcours vérifié, prouvé et inclusif, du bénéficiaire jusqu'à la preuve de remise. Merci de votre attention.",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Authentification requise" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      return json({ error: "Configuration Supabase incomplète" }, 503);
    }

    const asAgent = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await asAgent.auth.getUser();
    if (authError || !user) return json({ error: "Accès refusé" }, 401);

    const { text } = await req.json().catch(() => ({ text: "" }));
    if (typeof text !== "string" || !NARRATIONS.has(text)) {
      return json({ error: "Narration non autorisée" }, 400);
    }

    const azureEndpoint = Deno.env.get("AZURE_OPENAI_ENDPOINT")?.replace(/\/+$/, "");
    const azureApiKey = Deno.env.get("AZURE_OPENAI_API_KEY");
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    if ((!azureEndpoint || !azureApiKey) && !openAiApiKey) {
      return json({ error: "Voix GPT non configurée", fallback: "browser" }, 503);
    }

    const voice = Deno.env.get("OPENAI_TTS_VOICE") || "marin";
    const model = azureEndpoint && azureApiKey
      ? Deno.env.get("AZURE_OPENAI_TTS_DEPLOYMENT") || "gpt-4o-mini-tts"
      : "gpt-4o-mini-tts";
    const provider = azureEndpoint && azureApiKey ? "azure-openai" : "openai";
    const speechUrl = provider === "azure-openai"
      ? `${azureEndpoint}/openai/v1/audio/speech?api-version=preview`
      : "https://api.openai.com/v1/audio/speech";
    const response = await fetch(speechUrl, {
      method: "POST",
      headers: {
        ...(provider === "azure-openai"
          ? { "api-key": azureApiKey! }
          : { Authorization: `Bearer ${openAiApiKey!}` }),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        instructions:
          "Parle en français avec une voix institutionnelle, chaleureuse et assurée. Débit posé, articulation claire, sans emphase commerciale.",
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      console.error(`${provider} TTS ${response.status}: ${detail}`);
      return json({ error: "Génération vocale indisponible", fallback: "browser" }, 502);
    }

    const audio = new Uint8Array(await response.arrayBuffer());
    return json({
      audio_base64: toBase64(audio),
      media_type: "audio/mpeg",
      provider,
      model,
      voice,
      ai_generated: true,
    });
  } catch (error) {
    console.error(error);
    return json({ error: "Erreur interne de narration", fallback: "browser" }, 500);
  }
});
