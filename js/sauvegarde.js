// Sauvegarde de toutes les données dans un fichier JSON (manuelle ou automatique tous les 30 jours).
// La date de la dernière sauvegarde est mémorisée sur l'appareil (localStorage).
// Automatique uniquement sur ordinateur (souris), pour ne pas remplir le téléphone de fichiers.
import { h, toast, pref } from "./ui.js";

const JOURS = 30;
const CLE_DATE = "sauvegarde.derniere";
const CLE_AUTO = "sauvegarde.auto";

export const derniereSauvegarde = () => pref.get(CLE_DATE, null);
export const autoActive = () => pref.get(CLE_AUTO, true);
export const activerAuto = (v) => pref.set(CLE_AUTO, !!v);
export const prochaineSauvegarde = () => {
  const d = derniereSauvegarde();
  return d ? new Date(Date.parse(d) + JOURS * 864e5) : new Date();
};
const estOrdinateur = () => window.matchMedia("(pointer: fine)").matches;

/** Télécharge la sauvegarde complète (toutes années). */
export async function telechargerSauvegarde(store) {
  const json = await store.exportAll();
  const url = URL.createObjectURL(new Blob([JSON.stringify(json, null, 1)], { type: "application/json" }));
  const jour = new Date().toISOString().slice(0, 10);
  const a = h("a", { href: url, download: `sauvegarde-effectifs-${jour}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  pref.set(CLE_DATE, new Date().toISOString());
  return json;
}

/** À l'ouverture : sauvegarde automatique si la dernière a plus de 30 jours. */
export async function sauvegardeAutoSiBesoin(store) {
  if (!autoActive() || !estOrdinateur()) return;
  if (Date.now() < prochaineSauvegarde().getTime()) return;
  try {
    const json = await telechargerSauvegarde(store);
    const n = json.scolaire.length + json.mercredis.length + json.vacances.length;
    toast(`Sauvegarde mensuelle automatique téléchargée (${n} jours) — dossier Téléchargements`);
  } catch (e) {
    console.error(e);
    toast("La sauvegarde automatique a échoué, elle sera retentée à la prochaine ouverture.", "error");
  }
}
