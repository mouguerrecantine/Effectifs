// Constantes métier : écoles, groupes, périodes. (Fixes, cf. CLAUDE.md)

export const REPAS = [
  { k: "repasPort", l: "Port" },
  { k: "repasEliz", l: "Eliz." },
  { k: "repasBourg", l: "Bourg" },
];
export const GOUTERS = [
  { k: "gouterPort", l: "Port" },
  { k: "gouterEliz", l: "Eliz." },
  { k: "gouterBourg", l: "Bourg" },
  { k: "gouterSteMarie", l: "Ste Marie" },
];
export const MERCREDI = [
  { k: "poussins", l: "Poussins" },
  { k: "jaguars", l: "Jaguars" },
  { k: "cobra", l: "Cobra" },
  { k: "animateurs", l: "Animateurs" },
  { k: "personnel", l: "Personnel" },
];
export const VACANCES = [
  { k: "poussins", l: "Poussins" },
  { k: "jaguars", l: "Jaguars" },
  { k: "cobra", l: "Cobra" },
  { k: "passerelle", l: "Passerelle" },
  { k: "piqueEnfants", l: "Pique-nique enfants" },
  { k: "piqueAdultes", l: "Pique-nique adultes" },
  { k: "animateurs", l: "Animateurs" },
  { k: "personnel", l: "Personnel" },
];
export const PERIODES = [
  { k: "hiver", l: "Hiver" },
  { k: "printemps", l: "Printemps" },
  { k: "juillet", l: "Juillet" },
  { k: "aout", l: "Août" },
  { k: "toussaint", l: "Toussaint" },
];

// Règles de calcul reprises du fichier Excel
export const GOUTER_MERCREDI = ["poussins", "jaguars", "cobra", "animateurs"]; // = SUM(C:F) des feuilles mercredi
export const GOUTER_VACANCES = ["poussins", "jaguars", "cobra", "passerelle"]; // = SUM(C:F) des bilans vacances

export const KEYS = {
  scolaire: [...REPAS, ...GOUTERS].map((c) => c.k),
  mercredis: MERCREDI.map((c) => c.k),
  vacances: VACANCES.map((c) => c.k),
};

export const MOIS_COURT = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
export const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
