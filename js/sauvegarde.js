// Sauvegardes.
// 1) Sur le serveur (Firestore) : automatique tous les 30 jours à l'ouverture du site (n'importe quel appareil),
//    + « Sauvegarder maintenant ». Historique d'un an : les sauvegardes de plus de 365 jours sont supprimées.
// 2) Copie sur l'ordinateur (fichier JSON) : bouton, + option automatique mensuelle (désactivée par défaut).
import { h, toast, pref } from "./ui.js";
import { KEYS, PERIODES } from "./metier.js";

const JOURS_ENTRE = 30;
const JOURS_HISTORIQUE = 365;
const JOUR = 864e5;
export const TYPES = { auto: "Automatique", manuelle: "Manuelle", "avant-restauration": "Avant restauration" };

// ---------- Contrôle d'un export (fichier importé ou sauvegarde restaurée) ----------
const DATE = /^20\d\d-[01]\d-[0-3]\d$/;
export function valider(json) {
  if (json?.format !== "effectifs-v1") throw new Error("Ce fichier n'est pas une sauvegarde Outils cuisine.");
  for (const col of ["scolaire", "mercredis", "vacances"]) {
    if (!Array.isArray(json[col])) throw new Error(`Section « ${col} » manquante.`);
    for (const d of json[col]) {
      if (!DATE.test(d.date)) throw new Error(`Date invalide dans « ${col} » : ${d.date}`);
      for (const k of KEYS[col]) if (d[k] != null && !(Number.isInteger(d[k]) && d[k] >= 0 && d[k] <= 5000)) throw new Error(`Valeur invalide (${col} ${d.date} ${k}).`);
      if (col === "vacances" && !PERIODES.some((p) => p.k === d.periode)) throw new Error(`Période invalide le ${d.date}.`);
    }
  }
  const all = [...json.scolaire, ...json.mercredis, ...json.vacances].map((d) => d.date).sort();
  return { n: { scolaire: json.scolaire.length, mercredis: json.mercredis.length, vacances: json.vacances.length, periodes: (json.periodes || []).length },
    de: all[0], a: all.at(-1) };
}

// ---------- Compression (gzip natif du navigateur) ----------
const gzip = async (texte) => new Uint8Array(await new Response(new Blob([texte]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
const gunzip = async (octets) => new Response(new Blob([octets]).stream().pipeThrough(new DecompressionStream("gzip"))).text();

const pad = (n) => String(n).padStart(2, "0");
const idMaintenant = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`; };
const nbJours = (json) => json.scolaire.length + json.mercredis.length + json.vacances.length;

// ---------- Serveur ----------
export async function sauvegarderServeur(store, type = "manuelle") {
  const json = await store.exportAll();
  const octets = await gzip(JSON.stringify(json));
  const id = idMaintenant();
  await store.creerSauvegarde(id, type, nbJours(json), octets);
  return { id, nb: nbJours(json), taille: octets.length };
}

/** Supprime les sauvegardes de plus d'un an. */
export async function nettoyerHistorique(store, liste) {
  const limite = Date.now() - JOURS_HISTORIQUE * JOUR;
  const vieilles = liste.filter((s) => Date.parse(s.date) < limite);
  for (const s of vieilles) await store.supprimerSauvegarde(s.id);
  return vieilles.length;
}

/** Date de la dernière sauvegarde « régulière » (auto ou manuelle) dans la liste. */
export const derniereReguliere = (liste) => liste.find((s) => s.type !== "avant-restauration") || null;
export const prochaineServeur = (liste) => {
  const d = derniereReguliere(liste);
  return d ? new Date(Date.parse(d.date) + JOURS_ENTRE * JOUR) : new Date();
};

async function chargerJson(store, id) {
  const json = JSON.parse(await gunzip(await store.lireSauvegarde(id)));
  valider(json);
  return json;
}

/** Remet les données dans l'état d'une sauvegarde (après une sauvegarde de sécurité de l'état actuel). */
export async function restaurer(store, id, onProgress) {
  const json = await chargerJson(store, id);
  await sauvegarderServeur(store, "avant-restauration");
  return store.restaurerTout(json, onProgress);
}

export async function telechargerDepuisServeur(store, id) {
  telechargerJson(await chargerJson(store, id), `sauvegarde-effectifs-${id.slice(0, 10)}.json`);
}

// ---------- Copie locale (fichier) ----------
const CLE_DATE = "sauvegarde.derniere";
const CLE_AUTO = "sauvegarde.auto.v2"; // v2 : désactivée par défaut depuis les sauvegardes serveur
export const derniereLocale = () => pref.get(CLE_DATE, null);
export const autoLocaleActive = () => pref.get(CLE_AUTO, false);
export const activerAutoLocale = (v) => pref.set(CLE_AUTO, !!v);
const estOrdinateur = () => window.matchMedia("(pointer: fine)").matches;

function telechargerJson(json, nom) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(json, null, 1)], { type: "application/json" }));
  const a = h("a", { href: url, download: nom });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function telechargerCopie(store) {
  telechargerJson(await store.exportAll(), `sauvegarde-effectifs-${new Date().toISOString().slice(0, 10)}.json`);
  pref.set(CLE_DATE, new Date().toISOString());
}

// ---------- À l'ouverture du site ----------
export async function sauvegardeAutoSiBesoin(store) {
  try {
    const liste = await store.listerSauvegardes();
    if (Date.now() >= prochaineServeur(liste).getTime()) {
      const s = await sauvegarderServeur(store, "auto");
      toast(`Sauvegarde mensuelle enregistrée sur le serveur (${s.nb} jours)`);
      await nettoyerHistorique(store, liste);
    }
  } catch (e) {
    // Règles Firebase pas encore mises à jour, ou hors ligne : réessai à la prochaine ouverture.
    console.warn("Sauvegarde serveur impossible :", e?.code || e);
  }
  const d = derniereLocale();
  if (autoLocaleActive() && estOrdinateur() && (!d || Date.now() - Date.parse(d) >= JOURS_ENTRE * JOUR)) {
    try { await telechargerCopie(store); toast("Copie mensuelle téléchargée sur cet ordinateur (dossier Téléchargements)"); }
    catch (e) { console.warn("Copie locale impossible :", e); }
  }
}
