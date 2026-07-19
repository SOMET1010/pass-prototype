// ============================================================================
// Edge Function « ansut-hub »
// Passerelle de messagerie ANSUT Hub (SMS / Email / WhatsApp).
// Reçoit l'identifiant d'une notification déjà enregistrée en base
// (via pass_notifier_sms) et l'expédie réellement au bénéficiaire ou à son
// contact. En l'absence d'identifiants ANSUT_HUB_*, bascule proprement en
// mode « SIMULÉ » (aucun appel externe) — cohérent avec la charte du
// prototype. Le résultat est réinscrit en base par pass_notification_maj_dispatch.
//
// Secrets attendus (Project Settings → Edge Functions) :
//   ANSUT_HUB_URL, ANSUT_HUB_USERNAME, ANSUT_HUB_PASSWORD
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Canal = "SMS" | "Email" | "WhatsApp";

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "").replace(/\/api\/(SendSMS|message\/send)$/i, "");
}
function stripPlus(to: string): string {
  return to.replace(/^\+/, "").replace(/[\s-]/g, "");
}

async function sendViaAnsutHub(opts: {
  baseUrl: string; username: string; password: string;
  canal: Canal; to: string; content: string; subject?: string;
}): Promise<{ ok: boolean; status: number; response: unknown }> {
  const to = opts.canal === "Email" ? opts.to : stripPlus(opts.to);
  const body: Record<string, unknown> = {
    username: opts.username,
    password: opts.password,
    to,
    from: "ANSUT",
    content: opts.content,
    channel: opts.canal,
  };
  if (opts.canal === "Email") {
    body.subject = opts.subject ?? "Notification ANSUT";
    body.ishtml = false;
  }
  const res = await fetch(`${normalizeBaseUrl(opts.baseUrl)}/api/message/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let parsed: unknown = null;
  const text = await res.text();
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { ok: res.ok, status: res.status, response: parsed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const { id_notification, canal } = await req.json().catch(() => ({}));
    if (!id_notification) return json({ error: "id_notification requis" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Client porteur du JWT de l'agent → vérifie l'habilitation (RLS de lecture).
    const asAgent = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: notif, error: readErr } = await asAgent
      .from("notification")
      .select("id_notification, destinataire, message, canal")
      .eq("id_notification", id_notification)
      .maybeSingle();
    if (readErr || !notif) return json({ error: "Notification introuvable ou accès refusé" }, 403);

    const admin = createClient(url, serviceKey);
    const chan: Canal = (canal as Canal) ?? "SMS";

    const baseUrl = Deno.env.get("ANSUT_HUB_URL");
    const username = Deno.env.get("ANSUT_HUB_USERNAME");
    const password = Deno.env.get("ANSUT_HUB_PASSWORD");
    const configured = Boolean(baseUrl && username && password);

    let statut = "envoye", mode = "simule", ref: string | null = null, detail: string | null = null;

    if (!configured) {
      mode = "simule";
      detail = "Mode simulé — identifiants ANSUT Hub non configurés sur cet environnement.";
    } else if (!notif.destinataire) {
      statut = "echec"; mode = "reel";
      detail = "Aucun destinataire joignable enregistré.";
    } else {
      try {
        const r = await sendViaAnsutHub({
          baseUrl: baseUrl!, username: username!, password: password!,
          canal: chan, to: notif.destinataire, content: notif.message,
        });
        mode = "reel";
        statut = r.ok ? "envoye" : "echec";
        ref = typeof r.response === "object" && r.response
          ? String((r.response as Record<string, unknown>).id ?? (r.response as Record<string, unknown>).messageId ?? "")
          : null;
        detail = r.ok ? `ANSUT Hub ${r.status}` : `ANSUT Hub ${r.status} — ${JSON.stringify(r.response)}`.slice(0, 500);
      } catch (e) {
        statut = "echec"; mode = "reel";
        detail = `Exception passerelle : ${e instanceof Error ? e.message : String(e)}`.slice(0, 500);
      }
    }

    const { data: updated, error: upErr } = await admin.rpc("pass_notification_maj_dispatch", {
      p_id_notification: id_notification,
      p_statut: statut,
      p_mode: mode,
      p_ref: ref,
      p_detail: detail,
    });
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ result: { statut, mode, gateway: "ansut-hub", ref, detail, notification: updated } });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
