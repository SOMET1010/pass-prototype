// Pilotage « intelligent » de la feuille de route.
// Règle qui gouverne le calendrier PASS : aucun retard ne se rattrape en aval.
// On calcule donc en priorité : ce qui bloque, ce qui glisse, ce qui vient.

import type { WorkspaceData, Tache, Jalon, Decision } from "../types";
import { joursRestants, estEnRetard, joursEntre } from "./dates";

export interface Alerte {
  niveau: "critique" | "attention" | "info";
  titre: string;
  detail: string;
  lien?: string;
}

export const estOuverte = (t: Tache) => t.statut !== "fait";

// Une tâche est « en retard » si son échéance est passée et qu'elle n'est pas faite.
export function tachesEnRetard(d: WorkspaceData, ref: string): Tache[] {
  return d.taches.filter((t) => estOuverte(t) && estEnRetard(t.echeance, ref))
    .sort((a, b) => a.echeance.localeCompare(b.echeance));
}

// Tâches dont l'échéance tombe dans la fenêtre (jours) à venir.
export function tachesImminentes(d: WorkspaceData, ref: string, jours = 10): Tache[] {
  return d.taches.filter((t) => {
    const j = joursRestants(t.echeance, ref);
    return estOuverte(t) && j >= 0 && j <= jours;
  }).sort((a, b) => a.echeance.localeCompare(b.echeance));
}

export const tachesBloquees = (d: WorkspaceData) => d.taches.filter((t) => t.statut === "bloque");

// Décisions bloquantes non rendues, triées par urgence.
export function decisionsBloquantes(d: WorkspaceData): Decision[] {
  return d.decisions.filter((dec) => dec.bloquante && dec.statut !== "rendue" && dec.statut !== "sans_objet")
    .sort((a, b) => (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999"));
}

// Une tâche est « prête » si toutes ses dépendances sont faites.
export function dependancesNonSatisfaites(t: Tache, d: WorkspaceData): Tache[] {
  return t.dependances
    .map((id) => d.taches.find((x) => x.id === id))
    .filter((x): x is Tache => !!x && x.statut !== "fait");
}

// Jalon menacé : décision bloquante non rendue OU tâche amont en retard.
export function jalonsMenaces(d: WorkspaceData, ref: string): { jalon: Jalon; causes: string[] }[] {
  const res: { jalon: Jalon; causes: string[] }[] = [];
  for (const jalon of d.jalons) {
    if (jalon.statut === "atteint") continue;
    const causes: string[] = [];
    for (const dec of d.decisions) {
      if (dec.jalonsBloques.includes(jalon.id) && dec.statut !== "rendue" && dec.statut !== "sans_objet") {
        causes.push(`Décision en attente : ${dec.libelle}`);
      }
    }
    for (const t of d.taches) {
      if (t.jalonId === jalon.id && estOuverte(t) && estEnRetard(t.echeance, ref)) {
        causes.push(`Tâche en retard : ${t.libelle}`);
      }
    }
    if (causes.length) res.push({ jalon, causes });
  }
  return res;
}

// Avancement d'un chantier = moyenne pondérée de l'avancement de ses tâches.
export function avancementChantier(chantierId: string, d: WorkspaceData): number {
  const ts = d.taches.filter((t) => t.chantierId === chantierId);
  if (!ts.length) return 0;
  const somme = ts.reduce((s, t) => s + (t.statut === "fait" ? 100 : t.avancement), 0);
  return Math.round(somme / ts.length);
}

export function avancementGlobal(d: WorkspaceData): number {
  if (!d.taches.length) return 0;
  const somme = d.taches.reduce((s, t) => s + (t.statut === "fait" ? 100 : t.avancement), 0);
  return Math.round(somme / d.taches.length);
}

// Chemin critique simplifié : depuis chaque jalon décisif, on remonte la chaîne
// de tâches et jalons dont il dépend (fin -> début). Sert à répondre :
// « ce retard, il touche quoi en aval ? ».
export function chaineAval(jalonId: string, d: WorkspaceData): Jalon[] {
  const aval: Jalon[] = [];
  const visiter = (id: string) => {
    for (const j of d.jalons) {
      if (j.dependances.includes(id) && !aval.find((x) => x.id === j.id)) {
        aval.push(j);
        visiter(j.id);
      }
    }
  };
  visiter(jalonId);
  return aval.sort((a, b) => a.datePrevue.localeCompare(b.datePrevue));
}

// Partenaires dont l'échéance approche ou est passée (pour la relance).
export function partenairesARelancer(d: WorkspaceData, ref: string, jours = 10) {
  return d.partenaires.filter((p) => {
    if (!p.prochaineEcheance) return false;
    if (p.statutRelation === "convention_signee" || p.statutRelation === "engage") return false;
    const j = joursRestants(p.prochaineEcheance, ref);
    return j <= jours;
  }).sort((a, b) => (a.prochaineEcheance ?? "").localeCompare(b.prochaineEcheance ?? ""));
}

// Synthèse d'alertes pour le tableau de bord.
export function alertes(d: WorkspaceData, ref: string): Alerte[] {
  const out: Alerte[] = [];

  for (const dec of decisionsBloquantes(d)) {
    const j = dec.echeance ? joursRestants(dec.echeance, ref) : 99;
    out.push({
      niveau: j <= 7 ? "critique" : "attention",
      titre: `Décision à rendre : ${dec.libelle}`,
      detail: `${dec.instance} · conditionne : ${dec.ceQuElleConditionne}`,
      lien: "/decisions",
    });
  }

  for (const { jalon, causes } of jalonsMenaces(d, ref)) {
    out.push({
      niveau: "critique",
      titre: `Jalon menacé : ${jalon.libelle}`,
      detail: causes.join(" · "),
      lien: "/jalons",
    });
  }

  const retard = tachesEnRetard(d, ref);
  if (retard.length) {
    out.push({ niveau: "attention", titre: `${retard.length} tâche(s) en retard`, detail: retard.slice(0, 3).map((t) => t.libelle).join(" · "), lien: "/taches" });
  }

  for (const p of partenairesARelancer(d, ref)) {
    out.push({ niveau: "info", titre: `Partenaire à engager : ${p.libelle}`, detail: p.note ?? "Échéance proche", lien: "/partenaires" });
  }

  const ordre = { critique: 0, attention: 1, info: 2 };
  return out.sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
}

// Santé globale du programme.
export function sante(d: WorkspaceData, ref: string): { niveau: "rouge" | "orange" | "vert"; libelle: string } {
  const bloq = decisionsBloquantes(d).filter((dec) => dec.echeance && joursEntre(ref, dec.echeance) <= 7).length;
  const menaces = jalonsMenaces(d, ref).length;
  if (bloq > 0 || menaces > 1) return { niveau: "rouge", libelle: "Sous tension — décisions et jalons à sécuriser" };
  if (menaces > 0 || tachesEnRetard(d, ref).length > 0) return { niveau: "orange", libelle: "Vigilance — quelques points à traiter" };
  return { niveau: "vert", libelle: "Sur la trajectoire prévue" };
}
