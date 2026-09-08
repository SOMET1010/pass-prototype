// Scénario de la démonstration auto-jouée (mode « Démonstration »).
// Chaque étape : une route, un titre, une narration (dite à voix haute + affichée),
// et éventuellement un sélecteur d'élément à surligner.
export interface EtapeDemo {
  route: string;
  titre: string;
  texte: string;
  highlight?: string;
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
      titre: "Enrôlement assisté",
      texte:
        "Première étape : l'enrôlement. L'agent scanne les pièces disponibles, le dossier se pré-remplit, " +
        "et le consentement est recueilli. L'objectif est de rester sous une minute.",
    },
    {
      route: routeDossier,
      titre: "Éligibilité v3 & défendabilité",
      texte:
        "La vérification d'éligibilité. Les contrôles de régularité, bloquants, sont séparés du score sur cinq " +
        "dimensions, qui produit un rang de priorité de P1 à P4. Chaque décision est figée dans un cachet " +
        "reproductible : elle reste défendable des mois plus tard.",
      highlight: "#demo-eval",
    },
    {
      route: "/simulateur",
      titre: "Simulateur d'éligibilité",
      texte:
        "Le simulateur permet de tester une situation sans créer de dossier. Le rang se recalcule en direct, " +
        "selon les paramètres en vigueur : idéal pour la formation et pour mesurer l'effet d'un réglage.",
    },
    {
      route: "/parametres",
      titre: "Paramètres administrables",
      texte:
        "Ici, les poids et les seuils sont administrables, versionnés et horodatés : rien n'est codé en dur. " +
        "Les modes d'accès aux registres nationaux sont également configurables, source par source.",
    },
    {
      route: "/ciblage-geo",
      titre: "Ciblage géographique",
      texte:
        "Le ciblage géographique applique trois filtres, un score de priorisation, puis répartit les quotas. " +
        "Les localités rurales défavorisées sont priorisées, avec une réserve d'arbitrage toujours motivée et tracée.",
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
