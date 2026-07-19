// ============================================================================
// Edge Function « ansut-cachet »
// Cachet électronique / horodatage des pièces probantes via le service de
// Cryptologie ANSUT. Deux temps :
//   1. Scellement en base (pass_sceller) : empreinte SHA-256 réelle de la
//      pièce + signature de démonstration (HMAC). Fonctionne toujours, même
//      hors ligne (mode SIMULÉ).
//   2. Si les identifiants ANSUT_CRYPTO_* sont configurés, demande une
//      signature/horodatage qualifiés au service de cryptologie et bascule le
//      cachet en mode RÉEL (pass_cachet_maj).
//
// Secrets attendus :
//   ANSUT_CRYPTO_URL, ANSUT_CRYPTO_USERNAME, ANSUT_CRYPTO_PASSWORD
//   (ANSUT_CRYPTO_AUTORITE en option, ex. « ANSUT — Autorité de cachet »)
//
// Le contrat exact de l'API de cryptologie provient des projets ANSUT
// existants ; l'adaptateur ci-dessous poste { empreinte, algorithme } et lit
// { signature, reference } dans la réponse. À ajuster au format réel le jour
// du branchement — l'empreinte, elle, est déjà calculée et immuable.
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function requestQualifiedSeal(opts: {
  baseUrl: string; username: string; password: string; empreinte: string; algorithme: string;
}): Promise<{ ok: boolean; signature?: string; reference?: string; detail: string }> {
  const url = opts.baseUrl.replace(/\/+$/, "") + "/api/seal";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: opts.username,
      password: opts.password,
      hash: opts.empreinte,
      algorithm: opts.algorithme,
    }),
  });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) return { ok: false, detail: `Cryptologie ANSUT ${res.status} — ${text}`.slice(0, 500) };
  return {
    ok: true,
    signature: String(body.signature ?? body.seal ?? ""),
    reference: String(body.reference ?? body.id ?? body.token ?? ""),
    detail: `Cryptologie ANSUT ${res.status}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const { cible_type, cible_id } = await req.json().catch(() => ({}));
    if (!cible_type || !cible_id) return json({ error: "cible_type et cible_id requis" }, 400);
    if (!["decision", "preuve_remise"].includes(cible_type)) return json({ error: "cible_type invalide" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Scellement en base sous l'identité de l'agent (guard + audit).
    const asAgent = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: cachet, error: sealErr } = await asAgent.rpc("pass_sceller", {
      p_cible_type: cible_type,
      p_cible_id: cible_id,
    });
    if (sealErr) return json({ error: sealErr.message }, 403);
    const seal = Array.isArray(cachet) ? cachet[0] : cachet;
    if (!seal) return json({ error: "Scellement impossible" }, 500);

    const baseUrl = Deno.env.get("ANSUT_CRYPTO_URL");
    const username = Deno.env.get("ANSUT_CRYPTO_USERNAME");
    const password = Deno.env.get("ANSUT_CRYPTO_PASSWORD");
    const autorite = Deno.env.get("ANSUT_CRYPTO_AUTORITE") ?? "ANSUT — Autorité de cachet électronique";
    const configured = Boolean(baseUrl && username && password);

    // Déjà scellé en mode réel : rien à refaire.
    if (seal.mode === "reel") return json({ result: { mode: "reel", cachet: seal } });

    if (!configured) {
      return json({
        result: {
          mode: "simule",
          cachet: seal,
          detail: "Mode simulé — identifiants de cryptologie ANSUT non configurés sur cet environnement.",
        },
      });
    }

    const r = await requestQualifiedSeal({
      baseUrl: baseUrl!, username: username!, password: password!,
      empreinte: seal.empreinte, algorithme: seal.algorithme,
    });
    if (!r.ok || !r.signature) {
      return json({ result: { mode: "simule", cachet: seal, detail: r.detail } });
    }

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: upgraded, error: upErr } = await admin.rpc("pass_cachet_maj", {
      p_id_cachet: seal.id_cachet,
      p_signature: r.signature,
      p_reference: r.reference ?? null,
      p_autorite: autorite,
    });
    if (upErr) return json({ result: { mode: "simule", cachet: seal, detail: upErr.message } });

    const finalSeal = Array.isArray(upgraded) ? upgraded[0] : upgraded;
    return json({ result: { mode: "reel", cachet: finalSeal, detail: r.detail } });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
