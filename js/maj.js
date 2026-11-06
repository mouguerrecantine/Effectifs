// Mises à jour automatiques : enregistre le service worker et recharge l'application
// quand une nouvelle version est publiée (fichier version.json modifié à chaque mise en ligne).
import { toast } from "./ui.js";

const INTERVALLE = 5 * 60 * 1000; // vérification toutes les 5 minutes (+ au retour sur la fenêtre)
let actuelle = null;
let enCours = false;

async function lireVersion() {
  const r = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
  if (!r.ok) throw new Error("version.json " + r.status);
  return (await r.json()).version;
}

/** avantRecharge : enregistre la saisie en attente ; occupe : vrai si l'utilisateur est en train de taper. */
export function demarrerMisesAJour({ avantRecharge = async () => {}, occupe = () => false } = {}) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch((e) => console.warn("Service worker :", e));
  }
  const verifier = async () => {
    if (enCours || document.visibilityState !== "visible") return;
    enCours = true;
    try {
      const v = await lireVersion();
      if (actuelle === null) actuelle = v;
      else if (v !== actuelle) {
        if (occupe()) return; // on réessaiera à la prochaine vérification
        await avantRecharge();
        toast("Nouvelle version du site : mise à jour…");
        setTimeout(() => location.reload(), 1200);
        return;
      }
    } catch { /* hors ligne : on réessaiera */ } finally { enCours = false; }
  };
  verifier();
  setInterval(verifier, INTERVALLE);
  document.addEventListener("visibilitychange", verifier);
  window.addEventListener("focus", verifier);
}
