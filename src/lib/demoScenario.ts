// Scénario de la démonstration auto-jouée (mode « Démonstration »).
// Chaque étape : une route, un titre, une narration (dite à voix haute + affichée),
// éventuellement un sélecteur d'élément à surligner, et surtout des ACTIONS que
// l'« agent » exécute réellement à l'écran (déplacement de curseur, ouverture de
// menu, changement de valeur, clic) — pour montrer la plateforme en fonctionnement,
// et pas seulement lire un texte.

export type DemoAction =
  | { type: "select"; selector: string; value: string; note?: string }
  | { type: "click"; selector: string; note?: string }
  | { type: "type"; selector: string; value: string; note?: string }   // saisie caractère par caractère (animée)
  | { type: "fill"; selector: string; value: string; note?: string }   // valeur posée d'un coup (dates, nombres)
  | { type: "wait"; ms: number };

export interface EtapeDemo {
  route: string;
  titre: string;
  texte: string;
  highlight?: string;
  actions?: DemoAction[];
}

export function construireScenario(idDemande: string | null): EtapeDemo[] {
  const routeDossier = idDemande ? `/verification/${idDemande}` : "/dossiers";
  return [
    {
      route: "/",
      titre: "Accueil — pilotage du programme",
      texte:
        "Bienvenue sur la plateforme PASS, le Programme d'Accès aux Smartphones Subventionnés de l'ANSUT. " +
        "Voici le tableau de bord : la mission, les indicateurs du jour et le parcours du bénéficiaire.",
    },
    {
      route: "/enrolement",
      titre: "Enrôlement assisté — saisie & lecture de pièce",
      texte:
        "Première étape : l'enrôlement. Je commence par saisir manuellement le nom et les prénoms du bénéficiaire. " +
        "Puis, plutôt que tout retaper, l'agent lit la pièce d'identité : la reconnaissance automatique pré-remplit " +
        "le numéro, la date de naissance et la zone en une seconde. Le chronomètre vise moins d'une minute.",
      actions: [
        { type: "wait", ms: 500 },
        { type: "type", selector: '[data-demo="enr-nom"]', value: "DIALLO", note: "Saisie manuelle — Nom" },
        { type: "type", selector: '[data-demo="enr-prenoms"]', value: "Awa", note: "Saisie manuelle — Prénoms" },
        { type: "wait", ms: 900 },
        { type: "click", selector: '[data-demo="enr-persona-CI-003-112233"]', note: "Lecture automatique de la pièce (OCR simulé)" },
        { type: "wait", ms: 2200 },
      ],
    },
    {
      route: routeDossier,
      titre: "Éligibilité v3 & défendabilité",
      texte:
        "La vérification d'éligibilité. Je relance le moteur : les contrôles de régularité, bloquants, sont " +
        "séparés du score sur cinq dimensions, qui produit un rang de priorité de P1 à P4. Chaque décision " +
        "est figée dans un cachet reproductible : elle reste défendable des mois plus tard.",
      highlight: "#demo-eval",
      actions: idDemande
        ? [
            { type: "wait", ms: 600 },
            { type: "click", selector: '[data-demo="eval-run"]', note: "Relance du moteur d'éligibilité" },
            { type: "wait", ms: 2600 },
          ]
        : undefined,
    },
    {
      route: "/simulateur",
      titre: "Simulateur — je manipule les contrôles",
      texte:
        "Regardez : je bascule le contrôle « ligne mobile » sur non concluant — le verdict passe aussitôt à refus. " +
        "Je le rétablis, la demande redevient recevable avec son rang. Puis je change la techno de la ligne : " +
        "le score et le rang se recalculent en direct. Un refus vient toujours d'un contrôle, jamais d'un score faible.",
      highlight: '[data-demo="sim-result"]',
      actions: [
        { type: "wait", ms: 700 },
        { type: "select", selector: '[data-demo="sim-ctrl-ligne_mobile"]', value: "non_concluant", note: "Ligne mobile → non concluant" },
        { type: "wait", ms: 1900 },
        { type: "select", selector: '[data-demo="sim-ctrl-ligne_mobile"]', value: "concluant", note: "Ligne mobile → concluant" },
        { type: "wait", ms: 1500 },
        { type: "select", selector: '[data-demo="sim-techno"]', value: "2G", note: "Techno ligne → 2G" },
        { type: "wait", ms: 1800 },
      ],
    },
    {
      route: "/parametres",
      titre: "Paramètres administrables & versionnés",
      texte:
        "Ici, rien n'est codé en dur. Je modifie par exemple le poids du critère C1, et je saisis le motif : " +
        "chaque changement est horodaté, attribué et versionné, l'ancienne valeur restant archivée. " +
        "Les modes d'accès aux registres nationaux sont également configurables, source par source.",
      actions: [
        { type: "wait", ms: 600 },
        { type: "type", selector: '[data-demo="param-input-score_c1_poids"]', value: "35", note: "Poids C1 → 35" },
        { type: "type", selector: '[data-demo="param-motif-score_c1_poids"]', value: "Révision pondération (revue gouvernance)", note: "Motif obligatoire" },
        { type: "wait", ms: 1400 },
      ],
    },
    {
      route: "/ciblage-geo",
      titre: "Ciblage géographique — je lance le calcul",
      texte:
        "Le ciblage traite une campagne entière. Je fixe le volume de terminaux, puis je lance le calcul : " +
        "les trois filtres éliminatoires s'appliquent, le score priorise, et les quotas se répartissent. " +
        "Les localités rurales défavorisées remontent — la population éligible étant population fois taux de pauvreté — " +
        "avec une réserve d'arbitrage toujours motivée.",
      highlight: '[data-demo="geo-result"]',
      actions: [
        { type: "wait", ms: 600 },
        { type: "fill", selector: '[data-demo="geo-volume"]', value: "5000", note: "Volume → 5 000 terminaux" },
        { type: "wait", ms: 700 },
        { type: "click", selector: '[data-demo="geo-run"]', note: "Calculer le ciblage" },
        { type: "wait", ms: 3000 },
      ],
    },
    {
      route: "/logistique",
      titre: "Logistique de bout en bout",
      texte:
        "La chaîne logistique complète : de la commande au fournisseur jusqu'à la mission de terrain, " +
        "en passant par la réception, l'entrepôt et les points mobiles — chaque terminal étant tracé par son IMEI.",
    },
    {
      route: "/stock",
      titre: "Stock & points de retrait",
      texte:
        "La cartographie des points de retrait et l'état des stocks par centre, avec les seuils d'alerte de réapprovisionnement.",
    },
    {
      route: "/supervision",
      titre: "Supervision & conformité",
      texte:
        "La supervision suit les délais de service, un journal d'audit inaltérable et la conformité du programme.",
    },
    {
      route: "/a-propos",
      titre: "Conclusion",
      texte:
        "Voilà la plateforme PASS : un parcours vérifié, prouvé et inclusif, du bénéficiaire jusqu'à la preuve de remise. " +
        "Merci de votre attention.",
    },
  ];
}
