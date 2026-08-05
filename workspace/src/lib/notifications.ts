// Génération de notifications / relances.
// L'outil PRÉPARE les messages (objet + corps en français) ; l'envoi effectif
// (messagerie, courrier) reste une action humaine validée. Aucune adresse réelle
// de bénéficiaire n'est manipulée — uniquement des partenaires institutionnels.

import type { Partenaire, Tache, Membre, WorkspaceData } from "../types";
import { formatDate } from "./dates";

export interface Brouillon {
  destinataire: string;
  email?: string;
  objet: string;
  corps: string;
}

const SIGNATURE = "\n\nBien cordialement,\nÉquipe du programme PASS — ANSUT";

// Notification à un partenaire : invitation / relance selon l'état de la relation.
export function brouillonPartenaire(p: Partenaire, d: WorkspaceData): Brouillon {
  const conv = p.convention ? ` relative à « ${p.convention} »` : "";
  const ech = p.prochaineEcheance ? formatDate(p.prochaineEcheance) : "à convenir";

  let objet: string;
  let intro: string;
  switch (p.statutRelation) {
    case "a_engager":
      objet = `Programme PASS — sollicitation de ${p.libelle}`;
      intro = `Dans le cadre du déploiement du programme PASS, l'ANSUT souhaite engager un échange avec ${p.libelle}${conv}.`;
      break;
    case "en_cours":
      objet = `Programme PASS — suite de nos échanges (${p.libelle})`;
      intro = `Nous faisons suite à nos échanges${conv} et souhaitons en confirmer les prochaines étapes.`;
      break;
    case "engage":
      objet = `Programme PASS — confirmation des engagements (${p.libelle})`;
      intro = `Nous vous remercions pour votre engagement${conv} et revenons vers vous pour en préciser le calendrier.`;
      break;
    default:
      objet = `Programme PASS — ${p.libelle}`;
      intro = `Nous revenons vers vous au sujet de la convention${conv}.`;
  }

  const corps =
    `Madame, Monsieur,\n\n${intro}\n\n` +
    `Nous proposons de fixer un point d'étape à l'échéance du ${ech}.\n` +
    `${p.note ? `\nContexte : ${p.note}.\n` : ""}` +
    `Nous restons à votre disposition pour convenir des modalités.` +
    SIGNATURE;

  return { destinataire: p.libelle, email: p.contactEmail, objet, corps };
}

// Relance interne sur une tâche : rappel au responsable.
export function brouillonRelanceTache(t: Tache, membres: Membre[]): Brouillon {
  const m = membres.find((x) => x.id === t.assigneA);
  const objet = `PASS — relance : ${t.libelle}`;
  const corps =
    `Bonjour${m ? ` ${m.nom}` : ""},\n\n` +
    `Rappel concernant l'activité « ${t.libelle} » (livrable attendu : ${t.livrable}), ` +
    `dont l'échéance est fixée au ${formatDate(t.echeance)}.\n\n` +
    `Merci de confirmer l'avancement ou de signaler tout blocage — un blocage annoncé se traite, ` +
    `un blocage découvert coûte des semaines.` +
    SIGNATURE;
  return { destinataire: m?.nom ?? t.responsable, email: m?.email, objet, corps };
}

export function texteBrouillon(b: Brouillon): string {
  return `À : ${b.destinataire}${b.email ? ` <${b.email}>` : " (destinataire à renseigner)"}\nObjet : ${b.objet}\n\n${b.corps}`;
}
