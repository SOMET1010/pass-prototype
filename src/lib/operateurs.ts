// Identité de marque des 3 opérateurs partenaires (Côte d'Ivoire).
// Chaque opérateur est affiché avec SA couleur officielle, distincte de la
// charte ANSUT : ils se lisent comme des marques partenaires, jamais confondus
// avec l'interface ANSUT (dont le bleu/orange est proche de Moov).
export interface MarqueOperateur {
  nom: string;
  couleur: string;   // couleur de marque (fond de pastille)
  texte: string;     // couleur de texte lisible sur `couleur`
  court: string;     // libellé compact
}

// Correspondance tolérante aux variantes de libellé ("Orange", "Orange CI"…).
const MARQUES: MarqueOperateur[] = [
  { nom: "Orange CI", couleur: "#FF7900", texte: "#1D1D1B", court: "Orange" },
  { nom: "MTN CI", couleur: "#FFCB05", texte: "#1D1D1B", court: "MTN" },
  { nom: "Moov Africa", couleur: "#004E9E", texte: "#FFFFFF", court: "Moov" },
];

const NEUTRE: MarqueOperateur = { nom: "Opérateur", couleur: "#878787", texte: "#FFFFFF", court: "Opérateur" };

export function marqueOperateur(nom: string | null | undefined): MarqueOperateur {
  if (!nom) return NEUTRE;
  const n = nom.toLowerCase();
  return (
    MARQUES.find((m) => n.includes(m.court.toLowerCase()) || m.nom.toLowerCase().includes(n)) ?? {
      ...NEUTRE,
      nom,
      court: nom,
    }
  );
}

export const MARQUES_OPERATEUR = MARQUES;
