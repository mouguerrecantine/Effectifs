// Calculs des bilans (fonctions pures, sans Firebase). Année civile : janvier → décembre.
import { REPAS, GOUTERS, MERCREDI, VACANCES, PERIODES, GOUTER_MERCREDI, GOUTER_VACANCES } from "./metier.js";

export const somme = (o, keys) => keys.reduce((a, k) => a + (Number(o?.[k]) || 0), 0);
const R = REPAS.map((c) => c.k), G = GOUTERS.map((c) => c.k), M = MERCREDI.map((c) => c.k), V = VACANCES.map((c) => c.k);

export const repasScolaire = (d) => somme(d, R);          // Port + Eliz. + Bourg + Adultes
export const goutersScolaire = (d) => somme(d, G);        // Port + Eliz. + Bourg + Ste Marie
export const repasMercredi = (d) => somme(d, M);          // tous les groupes + animateurs + personnel
export const goutersMercredi = (d) => somme(d, GOUTER_MERCREDI);
export const repasVacances = (d) => somme(d, V);
export const goutersVacances = (d) => somme(d, GOUTER_VACANCES);

const ratio = (a, b) => (b ? a / b : 0);
const mois = (d) => Number(d.date.slice(5, 7)) - 1;
const zero = (keys) => Object.fromEntries(keys.map((k) => [k, 0]));

/** Ne garder que les jours jusqu'au "MM-JJ" donné (comparaison à date avec l'année précédente). */
export function jusqua(data, mmjj) {
  if (!mmjj) return data;
  const f = (arr) => arr.filter((d) => d.date.slice(5) <= mmjj);
  return { ...data, scolaire: f(data.scolaire), mercredis: f(data.mercredis), vacances: f(data.vacances) };
}

/** Bilan complet d'une année à partir des jours saisis. */
export function bilan(data) {
  const parMois = Array.from({ length: 12 }, () => ({
    scolaire: { jours: 0, ...zero(R), ...zero(G), repas: 0, gouters: 0 },
    mercredis: { jours: 0, ...zero(M), repas: 0, gouters: 0 },
    vacances: { jours: 0, repas: 0, gouters: 0 },
  }));
  const parPeriode = Object.fromEntries(PERIODES.map((p) => [p.k, { jours: 0, ...zero(V), repas: 0, gouters: 0 }]));

  for (const d of data.scolaire) {
    const m = parMois[mois(d)].scolaire;
    m.jours++;
    for (const k of [...R, ...G]) m[k] += d[k] || 0;
    m.repas += repasScolaire(d);
    m.gouters += goutersScolaire(d);
  }
  for (const d of data.mercredis) {
    const m = parMois[mois(d)].mercredis;
    m.jours++;
    for (const k of M) m[k] += d[k] || 0;
    m.repas += repasMercredi(d);
    m.gouters += goutersMercredi(d);
  }
  for (const d of data.vacances) {
    const m = parMois[mois(d)].vacances;
    m.jours++; m.repas += repasVacances(d); m.gouters += goutersVacances(d);
    const p = parPeriode[d.periode];
    if (p) {
      p.jours++;
      for (const k of V) p[k] += d[k] || 0;
      p.repas += repasVacances(d);
      p.gouters += goutersVacances(d);
    }
  }

  const tot = (sel, key) => parMois.reduce((a, m) => a + sel(m)[key], 0);
  const t = {
    joursScolaire: tot((m) => m.scolaire, "jours"),
    joursMercredis: tot((m) => m.mercredis, "jours"),
    joursVacances: tot((m) => m.vacances, "jours"),
    repasScolaire: tot((m) => m.scolaire, "repas"),
    repasMercredis: tot((m) => m.mercredis, "repas"),
    repasVacances: tot((m) => m.vacances, "repas"),
    goutersScolaire: tot((m) => m.scolaire, "gouters"),
    goutersMercredis: tot((m) => m.mercredis, "gouters"),
    goutersVacances: tot((m) => m.vacances, "gouters"),
    scolaire: Object.fromEntries([...R, ...G].map((k) => [k, tot((m) => m.scolaire, k)])),
    mercredis: Object.fromEntries(M.map((k) => [k, tot((m) => m.mercredis, k)])),
    vacances: Object.fromEntries(V.map((k) => [k, Object.values(parPeriode).reduce((a, p) => a + p[k], 0)])),
  };
  // Période scolaire = repas des écoles + mercredis (formule du bilan Excel 2026-2027)
  t.repasPeriodeScolaire = t.repasScolaire + t.repasMercredis;
  t.joursPeriodeScolaire = t.joursScolaire + t.joursMercredis;
  t.moyennePeriodeScolaire = ratio(t.repasPeriodeScolaire, t.joursPeriodeScolaire);
  t.moyenneScolaire = ratio(t.repasScolaire, t.joursScolaire);
  t.moyenneMercredis = ratio(t.repasMercredis, t.joursMercredis);
  t.moyenneVacances = ratio(t.repasVacances, t.joursVacances);
  t.moyenneGouters = ratio(t.goutersScolaire, t.joursScolaire); // formule Excel : goûters écoles / jours scolaires
  t.repasTotal = t.repasScolaire + t.repasMercredis + t.repasVacances;
  t.goutersTotal = t.goutersScolaire + t.goutersMercredis + t.goutersVacances;
  t.joursTotal = t.joursScolaire + t.joursMercredis + t.joursVacances;
  return { parMois, parPeriode, totaux: t };
}

/** Variation en % (null si pas de base de comparaison). */
export const variation = (now, before) => (before ? ((now - before) / before) * 100 : null);
