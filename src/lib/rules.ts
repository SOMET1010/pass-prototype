// Moteur de recommandation — documentation et miroir côté client.
//
// La logique FAISANT AUTORITÉ est en base (fonction pass_lancer_verifications).
// Ce module reproduit la même logique pour l'affichage, mais ne remplace jamais
// la base : c'est la valeur de `demande.recommandation` calculée en base qui fait foi.
//
// Règles couvertes : RM-037 (calcul de la recommandation), RM-038 (cas ambigu → instruction).

import type { Recommandation, ResultatVerif } from "./types";

export interface QuatreControles {
  identite: ResultatVerif; // ONECI (simulé)
  sociale: ResultatVerif; // RSU (simulé)
  ligne: ResultatVerif; // opérateur (simulé)
  historique: ResultatVerif; // référentiel PASS interne (réel)
}

/**
 * Calcule la recommandation à partir des 4 contrôles.
 * Ordre de priorité identique à la fonction SQL pass_lancer_verifications.
 */
export function calculerRecommandation(c: QuatreControles): Recommandation {
  if (c.historique === "non_concluant") return "non_eligible"; // déjà bénéficiaire (RM-032)
  if (c.sociale === "non_concluant") return "non_eligible"; // pas ayant droit
  if (c.identite === "non_concluant") return "a_instruire";
  if (c.ligne === "non_concluant" || c.ligne === "indisponible") return "a_instruire"; // RM-038
  return "eligible";
}

// ---- Libellés d'affichage (français) ----

export const LIBELLE_ROLE: Record<string, string> = {
  enrolement: "Agent d'enrôlement",
  instructeur: "Agent instructeur",
  remise: "Agent de remise",
  superviseur: "Superviseur",
};

export const LIBELLE_ETAT: Record<string, string> = {
  brouillon: "Brouillon",
  soumise: "Soumise",
  a_instruire: "À instruire",
  validee: "Validée",
  refusee: "Refusée",
};

export const LIBELLE_RECO: Record<string, string> = {
  eligible: "ÉLIGIBLE",
  non_eligible: "NON ÉLIGIBLE",
  a_instruire: "À INSTRUIRE",
};

export const LIBELLE_SOURCE: Record<string, string> = {
  oneci: "Identité — ONECI (état civil)",
  rsu: "Éligibilité sociale — RSU",
  operateur: "Ligne mobile — Opérateur",
  imei: "Terminal — Registre IMEI",
  historique: "Historique PASS — Référentiel interne",
};

export const LIBELLE_RESULTAT: Record<string, string> = {
  concluant: "Concluant",
  non_concluant: "Non concluant",
  indisponible: "Indisponible",
};

export const LIBELLE_MOYEN_CONSENT: Record<string, string> = {
  signature: "Signature",
  assiste_temoin: "Assisté avec témoin",
  otp: "Code OTP",
};

export const LIBELLE_STATUT_TERMINAL: Record<string, string> = {
  en_stock: "En stock",
  remis: "Remis",
  perdu: "Perdu",
  bloque: "Bloqué",
};

export const LIBELLE_SAV_TYPE: Record<string, string> = {
  perte: "Perte",
  vol: "Vol",
  panne: "Panne",
  autre: "Autre",
};

export const LIBELLE_CONTACT_RELATION: Record<string, string> = {
  soi_meme: "Bénéficiaire (déjà équipé)",
  proche: "Un proche",
  menage: "Téléphone du ménage",
  relais: "Relais communautaire",
  aucun: "Aucun contact — convocation papier",
};

export const LIBELLE_SAV_STATUT: Record<string, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  resolu: "Résolu",
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

export function formatDateHeure(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
