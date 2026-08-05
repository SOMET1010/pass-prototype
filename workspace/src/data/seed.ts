// Données initiales du programme PASS, extraites des documents de référence :
//   - PASS_Plan_Activite (activités, responsables, échéances, livrables)
//   - PASS_Chronogramme_Previsionnel (jalons décisifs, facteurs de décalage)
//   - PASSATION_WORKSPACE_PASS (chantiers, rôles, modèle)
//
// AUCUNE donnée de bénéficiaire. Données de pilotage uniquement.
// Date de référence du programme : 2026-08-05 (début de l'exécution).

import type {
  WorkspaceData, Chantier, Tache, Jalon, Decision, Risque, Partenaire, Seance, Membre, Fonction, Priorite, StatutTache,
} from "../types";

export const DATE_REFERENCE = "2026-08-05";

// ─────────────────────────────────────────────────────────── Chantiers (8 + coordination transverse)
const chantiers: Chantier[] = [
  { id: "ch-marche", code: "MAR", libelle: "Procédure de marché", perimetre: "Dossier de consultation, publication, attribution", referent: "Marchés", chargePrincipale: "Août à novembre", ordre: 1 },
  { id: "ch-juridique", code: "JUR", libelle: "Juridique", perimetre: "Conventions, délégation d'approbation, veille réglementaire", referent: "Juridique", chargePrincipale: "Août à novembre", ordre: 2 },
  { id: "ch-donnees", code: "DON", libelle: "Données et ciblage", perimetre: "Collecte, score, quotas régionaux", referent: "Données", chargePrincipale: "Août à octobre", ordre: 3 },
  { id: "ch-plateforme", code: "PLA", libelle: "Plateforme", perimetre: "Formalités, consultation de l'éditeur, recette", referent: "Plateforme", chargePrincipale: "Août à décembre", ordre: 4 },
  { id: "ch-partenaires", code: "PAR", libelle: "Relations partenaires", perimetre: "Rencontres, séminaire, suivi des engagements", referent: "Partenaires", chargePrincipale: "Août à septembre", ordre: 5 },
  { id: "ch-logistique", code: "LOG", libelle: "Logistique", perimetre: "Dédouanement, points de remise, distribution", referent: "Logistique", chargePrincipale: "Septembre à décembre", ordre: 6 },
  { id: "ch-budget", code: "BUD", libelle: "Budget", perimetre: "Engagement, paiement fractionné, exonération", referent: "Budget", chargePrincipale: "Continu", ordre: 7 },
  { id: "ch-communication", code: "COM", libelle: "Communication", perimetre: "Sensibilisation, annonce du lancement", referent: "Communication", chargePrincipale: "Octobre à décembre", ordre: 8 },
  { id: "ch-coordination", code: "COO", libelle: "Coordination & pilotage", perimetre: "Comité opérationnel, manuel opérationnel, pilote, reporting", referent: "Coordination", chargePrincipale: "Continu", transverse: true, ordre: 9 },
];

// ─────────────────────────────────────────────────────────── Jalons décisifs (chronogramme)
const jalons: Jalon[] = [
  { id: "jal-arbitrages", libelle: "Arbitrages DG (montant, mode de passation, base d'identification, pilote)", datePrevue: "2026-08-15", nature: "decision", chantierId: "ch-coordination", ceQuiEnDepend: "La publication de l'appel d'offres", dependances: [], decisif: true, statut: "en_cours" },
  { id: "jal-publication", libelle: "Publication de l'appel d'offres", datePrevue: "2026-08-20", nature: "reglementaire", chantierId: "ch-marche", ceQuiEnDepend: "Tout l'aval du calendrier", dependances: ["jal-arbitrages"], decisif: true, statut: "a_venir" },
  { id: "jal-remise-offres", libelle: "Remise des offres", datePrevue: "2026-10-05", nature: "reglementaire", chantierId: "ch-marche", ceQuiEnDepend: "Le jugement et l'attribution", dependances: ["jal-publication"], decisif: true, statut: "a_venir" },
  { id: "jal-signature", libelle: "Signature du marché", datePrevue: "2026-11-24", nature: "reglementaire", chantierId: "ch-marche", ceQuiEnDepend: "Le lancement de la fabrication", dependances: ["jal-remise-offres"], decisif: true, statut: "a_venir" },
  { id: "jal-remises-pilote", libelle: "Ouverture des remises du pilote", datePrevue: "2026-12-15", nature: "industriel", chantierId: "ch-coordination", ceQuiEnDepend: "La validation du dispositif", dependances: ["jal-signature"], decisif: true, statut: "a_venir" },
  { id: "jal-livraison-lot1", libelle: "Livraison du premier lot du déploiement", datePrevue: "2027-01-20", nature: "industriel", chantierId: "ch-logistique", ceQuiEnDepend: "Les premières remises du déploiement", dependances: ["jal-signature"], decisif: true, statut: "a_venir" },
  { id: "jal-rapport-pilote", libelle: "Rapport de phase pilote", datePrevue: "2027-01-31", nature: "interne", chantierId: "ch-coordination", ceQuiEnDepend: "L'affermissement des tranches suivantes", dependances: ["jal-remises-pilote"], decisif: true, statut: "a_venir" },
];

// ─────────────────────────────────────────────────────────── Décisions (registre — priorité n°1)
// Les neuf arbitrages du Point d'étape (situation au 4 août 2026, après CA du 30 juillet).
// Les quatre premiers conditionnent le lancement de la procédure de marché.
const decisions: Decision[] = [
  { id: "dec-montant", libelle: "Montant engageable sur 2026", ceQuElleConditionne: "Le volume du marché et sa structure en tranches", instance: "Direction Générale", statut: "a_instruire", echeance: "2026-08-11", bloquante: true, chantierId: "ch-budget", jalonsBloques: ["jal-publication"] },
  { id: "dec-passation", libelle: "Mode de passation retenu", ceQuElleConditionne: "Le calendrier entier de la procédure", instance: "Direction Générale", statut: "a_instruire", echeance: "2026-08-11", bloquante: true, chantierId: "ch-marche", jalonsBloques: ["jal-publication"] },
  { id: "dec-identification", libelle: "Base d'identification des bénéficiaires", ceQuElleConditionne: "Les conventions à engager et le paramétrage de la plateforme", instance: "Direction Générale", statut: "a_instruire", echeance: "2026-08-11", bloquante: true, chantierId: "ch-donnees", jalonsBloques: ["jal-publication"] },
  { id: "dec-lancement", libelle: "Date de lancement annoncée", ceQuElleConditionne: "La communication et les engagements publics", instance: "Direction Générale", statut: "a_instruire", echeance: "2026-08-11", bloquante: true, chantierId: "ch-communication", jalonsBloques: ["jal-publication"] },
  { id: "dec-pilote", libelle: "Phase pilote : principe et périmètre", ceQuElleConditionne: "La possibilité de remises avant la fin de l'année", instance: "Direction Générale", statut: "a_instruire", echeance: "2026-08-11", bloquante: true, chantierId: "ch-coordination", jalonsBloques: ["jal-remises-pilote"] },
  { id: "dec-delegation", libelle: "Délégation d'approbation du marché", ceQuElleConditionne: "La signature du marché sans convoquer une séance (sinon +3 semaines)", instance: "Direction Générale", statut: "a_instruire", echeance: "2026-08-18", bloquante: true, chantierId: "ch-juridique", jalonsBloques: ["jal-signature"] },
  { id: "dec-paiement", libelle: "Paiement fractionné de la contribution", ceQuElleConditionne: "L'accès réel des ménages les plus pauvres — à trancher avant la première remise", instance: "Direction Générale", statut: "a_instruire", echeance: "2026-08-25", bloquante: false, chantierId: "ch-budget", jalonsBloques: [] },
  { id: "dec-dedouanement", libelle: "Prise en charge du dédouanement", ceQuElleConditionne: "Le périmètre du marché logistique (offres libellées « rendu au port »)", instance: "Direction Générale", statut: "a_instruire", echeance: "2026-08-25", bloquante: false, chantierId: "ch-logistique", jalonsBloques: ["jal-livraison-lot1"] },
  { id: "dec-vocale", libelle: "Commande vocale : engager ou différer", ceQuElleConditionne: "Une clause du marché terminal et un volet de la plateforme", instance: "Direction Générale", statut: "a_instruire", echeance: "2026-09-04", bloquante: false, chantierId: "ch-plateforme", jalonsBloques: [] },
];

// ─────────────────────────────────────────────────────────── Risques (facteurs de décalage — chronogramme)
const risques: Risque[] = [
  { id: "r-arbitrages", libelle: "Retard sur les arbitrages de mi-août", effet: "Décalage de la publication, donc de tout l'aval", parade: "Point bimensuel DG ; décisions inscrites à l'ordre du jour du 11 août", maitrise: "interne", gravite: "critique", probabilite: "elevee", statut: "ouvert", chantierId: "ch-coordination" },
  { id: "r-controle", libelle: "Reprise du dossier par l'organe de contrôle", effet: "Décalage de la publication", parade: "Soumission anticipée à l'examen préalable, dossier complet", maitrise: "partagee", gravite: "elevee", probabilite: "moderee", statut: "ouvert", chantierId: "ch-marche" },
  { id: "r-recours", libelle: "Recours d'un candidat évincé", effet: "Suspension de la signature", parade: "Rigueur du rapport d'évaluation ; motivation des rejets", maitrise: "hors_de_notre_main", gravite: "elevee", probabilite: "moderee", statut: "ouvert", chantierId: "ch-marche" },
  { id: "r-fabrication", libelle: "Délai de fabrication de l'offre retenue (45 à 80 jours)", effet: "Décalage des premières remises", parade: "Critère d'attribution pondéré sur le délai de livraison", maitrise: "partagee", gravite: "moderee", probabilite: "elevee", statut: "ouvert", chantierId: "ch-marche" },
  { id: "r-dedouanement", libelle: "Dédouanement non tranché", effet: "Immobilisation de la marchandise au port", parade: "Décision écrite avant fin août ; rencontre Douanes", maitrise: "interne", gravite: "elevee", probabilite: "moderee", statut: "ouvert", chantierId: "ch-logistique" },
  { id: "r-conventions", libelle: "Conventions non signées", effet: "L'enrôlement ne peut ouvrir en mode vérifié", parade: "Séminaire d'engagement daté ; projets transmis dès août", maitrise: "partagee", gravite: "elevee", probabilite: "moderee", statut: "ouvert", chantierId: "ch-juridique" },
  { id: "r-decret", libelle: "Projet de décret sur l'identification", effet: "Le numéro national deviendrait obligatoire pour tout abonnement — or notre cible est la population la moins enregistrée", parade: "Instruction engagée ; suivi de l'avancement du texte", maitrise: "hors_de_notre_main", gravite: "elevee", probabilite: "moderee", statut: "ouvert", chantierId: "ch-donnees" },
  { id: "r-exoneration", libelle: "Exonération douanière non arrêtée", effet: "Détermine le nombre de bénéficiaires à enveloppe constante", parade: "Suivi en cours avec les Douanes ; décision de dédouanement", maitrise: "partagee", gravite: "moderee", probabilite: "moderee", statut: "ouvert", chantierId: "ch-logistique" },
  { id: "r-vocale", libelle: "Commande vocale annoncée mais non disponible au lancement", effet: "Écart entre la communication et le produit livré", parade: "Reformulation des supports ; décision engager/différer (arbitrage n°9)", maitrise: "interne", gravite: "faible", probabilite: "elevee", statut: "ouvert", chantierId: "ch-communication" },
  { id: "r-formalites", libelle: "Formalités régulateur : 30 jours d'instruction", effet: "Préalable à la mise en service — tout retard de dépôt décale la mise en service", parade: "Dépôt des saisines dès cette semaine", maitrise: "interne", gravite: "moderee", probabilite: "moderee", statut: "ouvert", chantierId: "ch-plateforme" },
];

// ─────────────────────────────────────────────────────────── Partenaires (suivi *sur* eux, non *avec* eux)
const partenaires: Partenaire[] = [
  { id: "p-regulateur", libelle: "Régulateur des télécommunications", nature: "institution", statutRelation: "a_engager", prochaineEcheance: "2026-08-08", note: "Rencontre semaine du 4 août — compte rendu attendu" },
  { id: "p-douanes", libelle: "Administration des Douanes", nature: "institution", statutRelation: "a_engager", prochaineEcheance: "2026-08-08", convention: "Exonération / dédouanement", note: "Rencontre semaine du 4 août" },
  { id: "p-etatcivil", libelle: "Office de l'état civil et de l'identification", nature: "institution", statutRelation: "a_engager", prochaineEcheance: "2026-08-15", convention: "Convention d'accès aux registres", note: "Rencontre semaine du 11 août" },
  { id: "p-cnam", libelle: "Caisse d'assurance maladie", nature: "institution", statutRelation: "a_engager", prochaineEcheance: "2026-08-15", convention: "Convention d'accès aux registres", note: "Ciblage — rencontre semaine du 11 août" },
  { id: "p-protection", libelle: "Ministère de la protection sociale", nature: "institution", statutRelation: "a_engager", prochaineEcheance: "2026-08-15", note: "Rencontre semaine du 11 août" },
  { id: "p-cyber", libelle: "Autorité de cybersécurité", nature: "institution", statutRelation: "a_engager", prochaineEcheance: "2026-08-22", note: "Exigences applicables à la plateforme" },
  { id: "p-orange", libelle: "Orange", nature: "operateur", statutRelation: "a_engager", prochaineEcheance: "2026-08-22", convention: "Convention-cadre opérateurs", note: "Réunion des trois opérateurs semaine du 18 août" },
  { id: "p-mtn", libelle: "MTN", nature: "operateur", statutRelation: "a_engager", prochaineEcheance: "2026-08-22", convention: "Convention-cadre opérateurs" },
  { id: "p-moov", libelle: "Moov Africa", nature: "operateur", statutRelation: "a_engager", prochaineEcheance: "2026-08-22", convention: "Convention-cadre opérateurs" },
  { id: "p-editeur", libelle: "Éditeur de la plateforme (à sélectionner)", nature: "fournisseur", statutRelation: "a_engager", prochaineEcheance: "2026-09-30", note: "Consultation à préparer puis lancer" },
  { id: "p-fournisseur", libelle: "Fournisseur de terminaux (à attribuer)", nature: "fournisseur", statutRelation: "a_engager", prochaineEcheance: "2026-11-30", note: "Issu de l'appel d'offres principal" },
];

// ─────────────────────────────────────────────────────────── Membres (équipe interne — exemples de comptes)
const membres: Membre[] = [
  { id: "m-chef", nom: "Chef de programme", fonction: "Coordination", role: "chef_programme", email: "chef.programme@ansut.exemple" },
  { id: "m-dg", nom: "Direction Générale", fonction: "Direction Générale", role: "direction_generale", email: "dg@ansut.exemple" },
  { id: "m-marche", nom: "Référent Marchés", fonction: "Marchés", role: "referent", email: "marches@ansut.exemple" },
  { id: "m-juridique", nom: "Référent Juridique", fonction: "Juridique", role: "referent", email: "juridique@ansut.exemple" },
  { id: "m-donnees", nom: "Référent Données", fonction: "Données", role: "referent", email: "donnees@ansut.exemple" },
  { id: "m-plateforme", nom: "Référent Plateforme", fonction: "Plateforme", role: "referent", email: "plateforme@ansut.exemple" },
  { id: "m-partenaires", nom: "Référent Partenaires", fonction: "Partenaires", role: "referent", email: "partenaires@ansut.exemple" },
  { id: "m-logistique", nom: "Référent Logistique", fonction: "Logistique", role: "referent", email: "logistique@ansut.exemple" },
  { id: "m-budget", nom: "Référent Budget", fonction: "Budget", role: "referent", email: "budget@ansut.exemple" },
  { id: "m-communication", nom: "Référent Communication", fonction: "Communication", role: "referent", email: "communication@ansut.exemple" },
  { id: "m-copil", nom: "Comité de pilotage", fonction: "Coordination", role: "comite_pilotage", email: "copil@ansut.exemple" },
];

const referentParFonction: Record<Fonction, string | undefined> = {
  "Direction Générale": "m-dg", Marchés: "m-marche", Juridique: "m-juridique", Données: "m-donnees",
  Plateforme: "m-plateforme", Partenaires: "m-partenaires", Logistique: "m-logistique", Budget: "m-budget",
  Communication: "m-communication", Coordination: "m-chef",
};

// ─────────────────────────────────────────────────────────── Tâches (plan d'activité, ~46 activités)
type Spec = [libelle: string, chantierId: string, responsable: Fonction, echeance: string, livrable: string, priorite: Priorite, statut?: StatutTache, avancement?: number, deps?: string[], jalonId?: string];

const specs: Record<string, Spec> = {
  // Semaine du 4 août
  t1: ["Inscrire le marché au plan de passation", "ch-marche", "Marchés", "2026-08-08", "Inscription effective", "haute", "en_cours", 60],
  t2: ["Publier l'avis de pré-information", "ch-marche", "Marchés", "2026-08-08", "Avis publié", "haute", "en_cours", 40],
  t3: ["Déposer les formalités de protection des données", "ch-plateforme", "Plateforme", "2026-08-08", "Dossier déposé", "haute", "a_faire", 0],
  t4: ["Déposer la déclaration de plateforme", "ch-plateforme", "Plateforme", "2026-08-08", "Récépissé", "haute", "a_faire", 0],
  t5: ["Demander les données d'électrification et de pauvreté", "ch-donnees", "Données", "2026-08-08", "Courriers transmis", "moyenne", "en_cours", 30],
  t6: ["Rencontrer le régulateur", "ch-partenaires", "Partenaires", "2026-08-08", "Compte rendu", "moyenne", "a_faire", 0],
  t7: ["Rencontrer les Douanes", "ch-partenaires", "Partenaires", "2026-08-08", "Compte rendu", "moyenne", "a_faire", 0],
  t8: ["Consolider les travaux du comité opérationnel", "ch-coordination", "Coordination", "2026-08-08", "Document consolidé", "moyenne", "en_cours", 50],
  // Semaine du 11 août
  t9: ["Rendre les quatre premières décisions", "ch-coordination", "Direction Générale", "2026-08-11", "Arbitrages notifiés", "haute", "a_faire", 0],
  t10: ["Rencontrer l'office de l'état civil", "ch-partenaires", "Partenaires", "2026-08-15", "Compte rendu", "moyenne", "a_faire", 0],
  t11: ["Rencontrer la caisse d'assurance maladie", "ch-partenaires", "Partenaires", "2026-08-15", "Compte rendu", "moyenne", "a_faire", 0],
  t12: ["Rencontrer le ministère de la protection sociale", "ch-partenaires", "Partenaires", "2026-08-15", "Compte rendu", "basse", "a_faire", 0],
  t13: ["Finaliser le cahier des clauses techniques", "ch-marche", "Marchés", "2026-08-15", "Dossier de consultation", "haute", "en_cours", 55, ["t1"]],
  t14: ["Soumettre le dossier à l'examen préalable", "ch-marche", "Marchés", "2026-08-15", "Dossier transmis", "haute", "a_faire", 0, ["t13"]],
  t15: ["Présenter les recommandations au comité de pilotage", "ch-coordination", "Coordination", "2026-08-15", "Relevé de décisions", "moyenne", "a_faire", 0],
  // Semaine du 18 août
  t16: ["Publier l'appel d'offres", "ch-marche", "Marchés", "2026-08-20", "Avis publié le 20 août", "haute", "a_faire", 0, ["t14", "t9"], "jal-publication"],
  t17: ["Réunir les trois opérateurs", "ch-partenaires", "Partenaires", "2026-08-22", "Principes de la convention-cadre", "moyenne", "a_faire", 0],
  t18: ["Instruire le paiement fractionné", "ch-budget", "Budget", "2026-08-22", "Étude de faisabilité", "moyenne", "a_faire", 0],
  t19: ["Rencontrer l'autorité de cybersécurité", "ch-plateforme", "Plateforme", "2026-08-22", "Exigences applicables", "basse", "a_faire", 0],
  t20: ["Lancer la consultation du pilote", "ch-marche", "Marchés", "2026-08-22", "Consultation lancée", "moyenne", "a_faire", 0],
  // Semaine du 25 août
  t21: ["Tenir le séminaire d'engagement", "ch-coordination", "Coordination", "2026-08-29", "Engagements datés par partenaire", "moyenne", "a_faire", 0],
  t22: ["Transmettre les projets de convention", "ch-juridique", "Juridique", "2026-08-29", "Quatre projets adressés", "moyenne", "a_faire", 0],
  t23: ["Préparer la consultation de l'éditeur", "ch-plateforme", "Plateforme", "2026-08-29", "Cahier des charges", "moyenne", "a_faire", 0],
  t24: ["Trancher la prise en charge du dédouanement", "ch-logistique", "Logistique", "2026-08-29", "Décision écrite", "haute", "a_faire", 0],
  // Septembre — octobre
  t25: ["Négocier les conventions d'accès aux registres", "ch-juridique", "Juridique", "2026-09-30", "Textes prêts à signer", "moyenne", "a_faire", 0],
  t26: ["Négocier la convention-cadre opérateurs", "ch-juridique", "Juridique", "2026-09-30", "Texte prêt à signer", "moyenne", "a_faire", 0, ["t17"]],
  t27: ["Recalculer le score sur les cinq critères", "ch-donnees", "Données", "2026-10-15", "Classement complet", "moyenne", "a_faire", 0, ["t5"]],
  t28: ["Produire la liste des zones et les quotas", "ch-donnees", "Données", "2026-10-15", "Allocation régionale", "moyenne", "a_faire", 0, ["t27"]],
  t29: ["Sélectionner l'éditeur de la plateforme", "ch-plateforme", "Plateforme", "2026-09-30", "Marché attribué", "moyenne", "a_faire", 0, ["t23"]],
  t30: ["Lancer la consultation logistique", "ch-logistique", "Logistique", "2026-09-15", "Consultation lancée", "moyenne", "a_faire", 0],
  t31: ["Recenser et préparer les points de remise", "ch-logistique", "Logistique", "2026-10-31", "Cartographie", "moyenne", "a_faire", 0, ["t30"]],
  t32: ["Rédiger le manuel opérationnel", "ch-coordination", "Coordination", "2026-10-31", "Première version", "basse", "a_faire", 0],
  t33: ["Obtenir la délégation d'approbation", "ch-juridique", "Juridique", "2026-09-30", "Délibération", "haute", "a_faire", 0],
  t34: ["Remise des offres et jugement", "ch-marche", "Marchés", "2026-10-05", "Rapport d'évaluation", "haute", "a_faire", 0, ["t16"], "jal-remise-offres"],
  t35: ["Attribution et notification", "ch-marche", "Marchés", "2026-11-05", "Notification adressée (après non-objection)", "haute", "a_faire", 0, ["t34"]],
  t36: ["Attribuer et signer le marché pilote", "ch-marche", "Marchés", "2026-10-15", "Marché signé", "moyenne", "a_faire", 0, ["t20"]],
  // Novembre — décembre
  t37: ["Signer le marché principal", "ch-marche", "Direction Générale", "2026-11-24", "Marché signé (après délai de recours)", "haute", "a_faire", 0, ["t35", "t33"], "jal-signature"],
  t38: ["Signer les conventions partenaires", "ch-juridique", "Direction Générale", "2026-11-30", "Quatre conventions", "haute", "a_faire", 0, ["t22", "t25", "t26"]],
  t39: ["Réceptionner et dédouaner le lot pilote", "ch-logistique", "Logistique", "2026-11-30", "Marchandise enlevée", "haute", "a_faire", 0, ["t24", "t37"]],
  t40: ["Livrer et équiper les points de remise", "ch-logistique", "Logistique", "2026-12-15", "Points opérationnels", "moyenne", "a_faire", 0, ["t31"]],
  t41: ["Former les agents d'enrôlement", "ch-coordination", "Coordination", "2026-12-15", "Agents formés", "moyenne", "a_faire", 0],
  t42: ["Livrer la plateforme en version pilote", "ch-plateforme", "Plateforme", "2026-12-15", "Recette prononcée", "haute", "a_faire", 0, ["t29"]],
  t43: ["Sensibiliser les relais locaux", "ch-communication", "Communication", "2026-12-01", "Campagne engagée", "moyenne", "a_faire", 0],
  t44: ["Ouvrir les remises du pilote", "ch-coordination", "Coordination", "2026-12-15", "Premières remises", "haute", "a_faire", 0, ["t39", "t40", "t42"], "jal-remises-pilote"],
  t45: ["Conduire la distribution pilote", "ch-coordination", "Coordination", "2026-12-31", "5 000 terminaux remis", "moyenne", "a_faire", 0, ["t44"]],
  t46: ["Produire le rapport de phase pilote", "ch-coordination", "Coordination", "2027-01-31", "Rapport aux instances", "moyenne", "a_faire", 0, ["t45"], "jal-rapport-pilote"],
};

const taches: Tache[] = Object.entries(specs).map(([id, s]) => ({
  id,
  libelle: s[0],
  chantierId: s[1],
  responsable: s[2],
  assigneA: referentParFonction[s[2]],
  echeance: s[3],
  livrable: s[4],
  priorite: s[5],
  statut: s[6] ?? "a_faire",
  avancement: s[7] ?? 0,
  dependances: s[8] ?? [],
  jalonId: s[9],
  relances: [],
}));

// ─────────────────────────────────────────────────────────── Séances / comités
const seances: Seance[] = [
  { id: "s-copil-aout", instance: "Comité de pilotage", date: "2026-08-13", rythme: "Mensuel", participants: ["Comité de pilotage", "Chef de programme"], ordreDuJour: ["Recommandations avant publication", "Décisions à rendre au 11 août", "État des chantiers"], releveDecisions: [], actionsGenerees: [], documents: [] },
  { id: "s-dg-aout", instance: "Direction Générale", date: "2026-08-11", rythme: "Bimensuel", participants: ["Direction Générale", "Chef de programme"], ordreDuJour: ["Rendre les quatre premières décisions", "Alertes calendrier"], releveDecisions: [], actionsGenerees: ["t9"], documents: [] },
  { id: "s-copoperationnel", instance: "Comité opérationnel", date: "2026-08-07", rythme: "Hebdomadaire", participants: ["Référents de chantier", "Chef de programme"], ordreDuJour: ["Avancement par chantier", "Levée des blocages"], releveDecisions: [], actionsGenerees: [], documents: [] },
];

export const SEED: WorkspaceData = {
  programme: {
    id: "prog-pass",
    libelle: "Programme PASS — Accès aux Smartphones Subventionnés",
    description: "Programme pluriannuel porté par l'ANSUT, validé par le Conseil d'administration du 30 juillet 2026. Ce workspace en pilote l'exécution : décisions, jalons, chantiers, actions, risques, documents et partenaires. Ciblage acquis : 377 localités du vivier identifiées (962 154 habitants, ~594 611 adultes) après filtre réseau. Outil interne — aucune donnée de bénéficiaire.",
    dateDebut: "2026-08-04",
    dateFin: "2027-07-31",
    statut: "En cours — décisions et procédure de marché",
  },
  chantiers, taches, jalons, decisions, risques, documents: [], partenaires, seances, membres,
};

export const ROLES = [
  { id: "chef_programme" as const, libelle: "Chef de programme", description: "Écriture complète, administration" },
  { id: "referent" as const, libelle: "Référent de chantier", description: "Écriture sur son chantier, lecture sur le reste" },
  { id: "comite_pilotage" as const, libelle: "Comité de pilotage", description: "Lecture complète, validation des décisions" },
  { id: "direction_generale" as const, libelle: "Direction Générale", description: "Lecture complète, arbitrage des décisions réservées" },
  { id: "observateur" as const, libelle: "Observateur", description: "Lecture seule, hors documents confidentiels" },
];
