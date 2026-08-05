// Client de la passerelle de notifications ANSUT (« Hub ANSUT »).
// S'appuie sur la fonction edge `ansut-notify` du projet ANSUT Radar Pro, qui
// route vers le Hub unifié (Email, SMS, Telegram, WhatsApp).
//
// SÉCURITÉ : aucun secret n'est stocké dans le dépôt. L'URL et le jeton Bearer
// sont saisis dans l'outil (rôle chef de programme) et conservés localement dans
// le navigateur. Utiliser de préférence un JWT d'un compte ADMIN du hub, et non
// la clé service_role. L'URL par défaut peut être fournie via VITE_ANSUT_NOTIFY_URL.

export type Canal = "email" | "sms" | "telegram" | "whatsapp";

export interface GatewayConfig {
  url: string;
  token: string;
  apikey?: string;
}

export interface EnvoiEmail { channel: "email"; to: string; subject: string; content: string; cc?: string; bcc?: string; ishtml?: boolean }
export interface EnvoiSms { channel: "sms"; to: string; content: string }
export interface EnvoiTelegram { channel: "telegram"; to: string; content: string; from?: string }
export interface EnvoiWhatsApp { channel: "whatsapp"; to: string; whatsAppTemplate: { name: string; languageCode: string } }
export type Envoi = EnvoiEmail | EnvoiSms | EnvoiTelegram | EnvoiWhatsApp;

export interface Resultat { ok: boolean; message: string; details?: unknown }

const CFG_KEY = "pass-workspace:gateway:v1";
const DEFAULT_URL =
  (import.meta as any).env?.VITE_ANSUT_NOTIFY_URL ||
  "https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/ansut-notify";

export function getGatewayConfig(): GatewayConfig {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) return { url: DEFAULT_URL, token: "", ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { url: DEFAULT_URL, token: "", apikey: "" };
}

export function setGatewayConfig(cfg: GatewayConfig) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

export const gatewayConfiguree = () => !!getGatewayConfig().token;

export const CANAUX: { id: Canal; label: string }[] = [
  { id: "email", label: "E-mail" },
  { id: "sms", label: "SMS" },
  { id: "telegram", label: "Telegram" },
  { id: "whatsapp", label: "WhatsApp" },
];

export async function envoyerNotification(envoi: Envoi): Promise<Resultat> {
  const cfg = getGatewayConfig();
  if (!cfg.url || !cfg.token) {
    return { ok: false, message: "Passerelle non configurée — renseignez l'URL et le jeton dans les réglages." };
  }

  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.token}`,
        apikey: cfg.apikey || cfg.token,
      },
      body: JSON.stringify(envoi),
    });
    const texte = await res.text();
    let corps: any = texte;
    try { corps = JSON.parse(texte); } catch { /* keep text */ }

    if (!res.ok || corps?.error) {
      const msg = corps?.error?.message || `Erreur passerelle (${res.status})`;
      return { ok: false, message: msg, details: corps };
    }
    return { ok: true, message: `Notification ${envoi.channel} transmise au Hub ANSUT`, details: corps };
  } catch (e) {
    return { ok: false, message: `Impossible de joindre la passerelle : ${String(e)}` };
  }
}
