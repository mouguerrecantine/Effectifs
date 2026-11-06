// Accès aux données Firestore. Un document par jour, identifiant = date "AAAA-MM-JJ".
//   scolaire/{date}   repas + goûters des écoles
//   mercredis/{date}  accueil du mercredi
//   vacances/{date}   accueil des vacances (+ champ "periode")
//   periodes/{annee-periode}  dates de début/fin d'une période de vacances
// Un jour sans aucune valeur est supprimé → "jour travaillé" = jour qui a au moins une valeur.
import { db } from "./firebase.js";
import {
  collection, doc, getDocs, query, where, setDoc, deleteDoc, writeBatch, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { KEYS } from "./metier.js";

// Colonne « Adultes » retirée de l'interface : le champ reste écrit à 0 car les règles Firestore
// publiées l'exigent (inutile de les republier).
const COMPAT = { scolaire: { repasAdultes: 0 } };

const cache = new Map(); // année -> { scolaire, mercredis, vacances, periodes }
const clean = (d) => { const { maj, repasAdultes, ...rest } = d; return rest; };
const byDate = (a, b) => (a.date < b.date ? -1 : 1);

export async function loadYear(year, { force = false } = {}) {
  if (!force && cache.has(year)) return cache.get(year);
  const range = (col) => query(collection(db, col), where("date", ">=", `${year}-01-01`), where("date", "<=", `${year}-12-31`));
  const [s, m, v, p] = await Promise.all([
    getDocs(range("scolaire")), getDocs(range("mercredis")), getDocs(range("vacances")),
    getDocs(query(collection(db, "periodes"), where("annee", "==", year))),
  ]);
  const data = {
    scolaire: s.docs.map((d) => clean(d.data())).sort(byDate),
    mercredis: m.docs.map((d) => clean(d.data())).sort(byDate),
    vacances: v.docs.map((d) => clean(d.data())).sort(byDate),
    periodes: p.docs.map((d) => ({ id: d.id, ...clean(d.data()) })),
  };
  cache.set(year, data);
  return data;
}

/** Enregistre un jour. `values` = { champ: nombre }. Renvoie le document (ou null si supprimé). */
export async function saveDay(col, date, values, extra = {}) {
  const nums = Object.fromEntries(KEYS[col].map((k) => [k, Math.max(0, Math.trunc(Number(values[k]) || 0))]));
  const vide = Object.values(nums).every((n) => n === 0);
  const ref = doc(db, col, date);
  if (vide) await deleteDoc(ref);
  else await setDoc(ref, { date, ...extra, ...COMPAT[col], ...nums, maj: serverTimestamp() });
  const rec = vide ? null : { date, ...extra, ...nums };
  const y = cache.get(Number(date.slice(0, 4)));
  if (y) {
    y[col] = y[col].filter((d) => d.date !== date);
    if (rec) { y[col].push(rec); y[col].sort(byDate); }
  }
  return rec;
}

export async function savePeriode(annee, periode, debut, fin) {
  const id = `${annee}-${periode}`;
  await setDoc(doc(db, "periodes", id), { annee, periode, debut, fin, maj: serverTimestamp() });
  const y = cache.get(annee);
  if (y) y.periodes = [...y.periodes.filter((p) => p.id !== id), { id, annee, periode, debut, fin }];
}

/** Import d'une sauvegarde / des données initiales (format "effectifs-v1"). */
export async function importAll(json, onProgress = () => {}) {
  const ops = [];
  for (const col of ["scolaire", "mercredis", "vacances"]) {
    for (const d of json[col] || []) {
      const nums = Object.fromEntries(KEYS[col].map((k) => [k, Math.max(0, Math.trunc(Number(d[k]) || 0))]));
      const extra = col === "vacances" ? { periode: d.periode } : {};
      ops.push([doc(db, col, d.date), { date: d.date, ...extra, ...COMPAT[col], ...nums, maj: serverTimestamp() }]);
    }
  }
  for (const p of json.periodes || []) {
    ops.push([doc(db, "periodes", `${p.annee}-${p.periode}`), { annee: p.annee, periode: p.periode, debut: p.debut, fin: p.fin, maj: serverTimestamp() }]);
  }
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    for (const [ref, data] of ops.slice(i, i + 400)) batch.set(ref, data);
    await batch.commit();
    onProgress(Math.min(ops.length, i + 400) / ops.length);
  }
  cache.clear();
  return ops.length;
}

/** Sauvegarde complète (toutes les années). */
export async function exportAll() {
  const all = async (col) => (await getDocs(collection(db, col))).docs.map((d) => clean(d.data()))
    .sort((a, b) => ((a.date || a.debut) < (b.date || b.debut) ? -1 : 1));
  const [scolaire, mercredis, vacances, periodes] = await Promise.all(["scolaire", "mercredis", "vacances", "periodes"].map(all));
  return { format: "effectifs-v1", genere: new Date().toISOString(), scolaire, mercredis, vacances, periodes };
}

export const clearCache = () => cache.clear();
