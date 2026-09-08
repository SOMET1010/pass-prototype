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
    // ————— Accueil —————
    {
      route: "/",
      titre: "Accueil — pilotage du programme",
      texte:
        "Bienvenue sur la plateforme PASS, le Programme d'Accès aux Smartphones Subventionnés de l'ANSUT. " +
        "La navigation suit quatre grands moments : le Quotidien du terrain, la Distribution, la Gouvernance, " +
        "et l'Aide. Nous allons les parcourir dans cet ordre. Voici d'abord le tableau de bord.",
    },

    // ————— 1. QUOTIDIEN : le parcours d'un bénéficiaire —————
    {
      route: "/enrolement",
      titre: "Quotidien · Enrôlement assisté",
      texte:
        "Commençons par le Quotidien du terrain. Première étape : l'enrôlement. Je saisis manuellement le nom et " +
        "les prénoms, puis, plutôt que tout retaper, l'agent lit la pièce d'identité : la reconnaissance automatique " +
        "pré-remplit le numéro, la date de naissance et la zone en une seconde. Le chronomètre vise moins d'une minute.",
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
      titre: "Quotidien · Éligibilité v3 & défendabilité",
      texte:
        "Toujours dans le Quotidien : la vérification d'éligibilité du dossier. Je relance le moteur — les contrôles " +
        "de régularité, bloquants, sont séparés du score sur cinq dimensions, qui produit un rang de priorité de P1 " +
        "à P4. Chaque décision est figée dans un cachet reproductible : elle reste défendable des mois plus tard.",
      highlight: "#demo-eval",
      actions: idDemande
        ? [
            { type: "wait", ms: 600 },
            { type: "click", selector: '[data-demo="eval-run"]', note: "Relance du moteur d'éligibilité" },
            { type: "wait", ms: 2600 },
          ]
        : undefined,
    },

    // ————— 2. DISTRIBUTION : la logistique physique —————
    {
      route: "/logistique",
      titre: "Distribution · Logistique de bout en bout",
      texte:
        "Passons à la Distribution. La chaîne logistique complète : de la commande au fournisseur jusqu'à la mission " +
        "de terrain, en passant par la réception, l'entrepôt et les points mobiles — chaque terminal étant tracé par son IMEI.",
    },
    {
      route: "/stock",
      titre: "Distribution · Stock & points de retrait",
      texte:
        "Toujours côté Distribution : la cartographie des points de retrait et l'état des stocks par centre, " +
        "avec les seuils d'alerte de réapprovisionnement.",
    },

    // ————— 3. GOUVERNANCE : règles, ciblage, pilotage —————
    {
      route: "/ciblage-geo",
      titre: "Gouvernance · Ciblage géographique",
      texte:
        "Voici la Gouvernance du programme. Le ciblage traite une campagne entière : je fixe le volume de terminaux, " +
        "puis je lance le calcul. Les trois filtres s'appliquent, le score priorise, les quotas se répartissent — " +
        "les localités rurales défavorisées remontent, la population éligible étant population fois taux de pauvreté, " +
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
      route: "/parametres",
      titre: "Gouvernance · Paramètres administrables",
      texte:
        "Les règles derrière tout cela sont administrables : rien n'est codé en dur. Je modifie par exemple le poids " +
        "du critère C1 et je saisis le motif — chaque changement est horodaté, attribué et versionné, l'ancienne " +
        "valeur restant archivée. Les modes d'accès aux registres nationaux sont aussi configurables, source par source.",
      actions: [
        { type: "wait", ms: 600 },
        { type: "type", selector: '[data-demo="param-input-score_c1_poids"]', value: "35", note: "Poids C1 → 35" },
        { type: "type", selector: '[data-demo="param-motif-score_c1_poids"]', value: "Révision pondération (revue gouvernance)", note: "Motif obligatoire" },
        { type: "wait", ms: 1400 },
      ],
    },
    {
      route: "/simulateur",
      titre: "Gouvernance · Simulateur d'éligibilité",
      texte:
        "Le simulateur permet d'éprouver ces règles sans créer de dossier. Regardez : je bascule le contrôle « ligne " +
        "mobile » sur non concluant — le verdict passe aussitôt à refus. Je le rétablis, la demande redevient recevable. " +
        "Puis je change la techno de la ligne : le score et le rang se recalculent en direct. Un refus vient toujours " +
        "d'un contrôle, jamais d'un score faible.",
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
      route: "/supervision",
      titre: "Gouvernance · Supervision & conformité",
      texte:
        "Pour clore la Gouvernance : la supervision suit les délais de service, un journal d'audit inaltérable et " +
        "la conformité du programme.",
    },

    // ————— 4. AIDE : conclusion —————
    {
      route: "/a-propos",
      titre: "Aide · Conclusion",
      texte:
        "Voilà la plateforme PASS, parcourue dans son ordre logique : Quotidien, Distribution, Gouvernance. " +
        "Un parcours vérifié, prouvé et inclusif, du bénéficiaire jusqu'à la preuve de remise. Merci de votre attention.",
    },
  ];
}
