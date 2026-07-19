// Ponts client vers les API institutionnelles ANSUT (via Edge Functions).
//   - ANSUT Hub      : expédition réelle des notifications (SMS/Email/WhatsApp)
//   - Cryptologie    : cachet électronique / horodatage des pièces probantes
// En l'absence d'identifiants côté serveur, les fonctions répondent en mode
// « simulé » — la chaîne reste identique, seul le badge change.
import { supabase } from "./supabase";
import type { CachetElectronique, CibleCachet, ModeIntegration, Notification } from "./types";

export interface DispatchNotification {
  statut: "en_attente" | "envoye" | "echec";
  mode: ModeIntegration;
  gateway: string;
  ref: string | null;
  detail: string | null;
  notification?: Notification;
}

/** Expédie une notification déjà enregistrée via la passerelle ANSUT Hub. */
export async function envoyerNotification(
  id_notification: string,
  canal: "SMS" | "Email" | "WhatsApp" = "SMS",
): Promise<DispatchNotification> {
  const { data, error } = await supabase.functions.invoke("ansut-hub", {
    body: { id_notification, canal },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data.result as DispatchNotification;
}

export interface ResultatCachet {
  mode: ModeIntegration;
  cachet: CachetElectronique;
  detail?: string;
}

/**
 * Scelle une pièce probante (décision ou preuve de remise).
 * Passe par l'Edge Function « ansut-cachet » (empreinte + signature qualifiée
 * si la cryptologie ANSUT est configurée). Repli sur la RPC pass_sceller
 * (scellement local, mode simulé) si la fonction est injoignable.
 */
export async function scellerPiece(
  cible_type: CibleCachet,
  cible_id: string,
): Promise<ResultatCachet> {
  try {
    const { data, error } = await supabase.functions.invoke("ansut-cachet", {
      body: { cible_type, cible_id },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(String(data.error));
    return data.result as ResultatCachet;
  } catch (_e) {
    // Repli direct sur la base (scellement local, toujours disponible).
    const { data, error } = await supabase.rpc("pass_sceller", {
      p_cible_type: cible_type,
      p_cible_id: cible_id,
    });
    if (error) throw error;
    const cachet = (Array.isArray(data) ? data[0] : data) as CachetElectronique;
    return { mode: cachet.mode, cachet };
  }
}

/** Lit le cachet existant d'une pièce, s'il y en a un. */
export async function lireCachet(
  cible_type: CibleCachet,
  cible_id: string,
): Promise<CachetElectronique | null> {
  const { data } = await supabase
    .from("cachet_electronique")
    .select("*")
    .eq("cible_type", cible_type)
    .eq("cible_id", cible_id)
    .maybeSingle();
  return (data as CachetElectronique) ?? null;
}
