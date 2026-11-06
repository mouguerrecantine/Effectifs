// Paramètres : sauvegardes (serveur + copie locale), import des données, compte.
import { h, icon, toast, confirmer, fmt } from "../ui.js";
import { long } from "../dates.js";
import {
  valider, TYPES, sauvegarderServeur, restaurer, telechargerDepuisServeur, prochaineServeur, nettoyerHistorique,
  telechargerCopie, derniereLocale, autoLocaleActive, activerAutoLocale,
} from "../sauvegarde.js";

export function render(page, { store, auth, setSubtitle }) {
  setSubtitle("Import, sauvegarde et compte");
  const input = h("input", { type: "file", accept: ".json,application/json", class: "sr-only", id: "file" });
  const zone = h("label", { class: "dropzone", for: "file" }, h("span", { html: icon("upload").innerHTML, style: { display: "inline-flex" } }),
    h("b", {}, "Choisir un fichier JSON"), h("span", {}, "ou le glisser ici (données initiales ou sauvegarde)"));
  const result = h("div", {});

  async function lire(file) {
    result.replaceChildren();
    let json, info;
    try { json = JSON.parse(await file.text()); info = valider(json); }
    catch (e) { toast(e.message || "Fichier illisible", "error"); return; }
    const bar = h("div", {});
    const btn = h("button", { class: "btn primary", onclick: async () => {
      if (!(await confirmer("Importer ces données ?", "Les jours déjà présents à ces dates seront remplacés par ceux du fichier. Les autres jours ne sont pas modifiés.", { ok: "Importer" }))) return;
      btn.disabled = true;
      const prog = h("div", { class: "progress" }, bar);
      result.append(prog);
      try {
        const n = await store.importAll(json, (p) => { bar.style.width = `${Math.round(p * 100)}%`; });
        toast(`${fmt(n)} éléments importés`);
        btn.replaceChildren(h("span", { html: icon("check").innerHTML, style: { display: "inline-flex" } }), "Import terminé");
      } catch (e) {
        console.error(e);
        toast(e?.code === "permission-denied" ? "Refusé par Firebase : vérifiez les règles (UID)." : "Échec de l'import.", "error");
        btn.disabled = false;
      }
    } }, "Importer");
    result.replaceChildren(
      h("div", { class: "summary" },
        h("div", {}, h("b", {}, fmt(info.n.scolaire)), h("span", {}, "jours écoles")),
        h("div", {}, h("b", {}, fmt(info.n.mercredis)), h("span", {}, "mercredis")),
        h("div", {}, h("b", {}, fmt(info.n.vacances)), h("span", {}, "jours vacances")),
        h("div", {}, h("b", {}, fmt(info.n.periodes)), h("span", {}, "périodes"))),
      h("p", {}, `Du ${long(info.de)} au ${long(info.a)}.`), btn);
  }
  input.addEventListener("change", () => input.files[0] && lire(input.files[0]));
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("over"); if (e.dataTransfer.files[0]) lire(e.dataTransfer.files[0]); });

  const fmtDate = (d) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
  const fmtHeure = (d) => new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
  const ico = (n) => h("span", { html: icon(n).innerHTML, style: { display: "inline-flex" } });

  // ---------- Sauvegardes sur le serveur ----------
  const liste = h("div", { class: "backups" }, h("div", { class: "splash", style: { position: "static", padding: "24px" } }, h("div", { class: "spinner" })));
  const prochaine = h("p", { class: "note", style: { margin: "0 0 14px" } });

  async function chargerListe() {
    let items;
    try { items = await store.listerSauvegardes(); }
    catch (e) {
      console.error(e);
      prochaine.replaceChildren();
      liste.replaceChildren(h("div", { class: "alert" }, ico("alert"), h("span", {},
        e?.code === "permission-denied"
          ? "Les sauvegardes sur le serveur ne sont pas encore activées : il faut mettre à jour les règles de sécurité dans Firebase (Firestore > Règles)."
          : "Impossible de lire les sauvegardes (connexion internet ?).")));
      return;
    }
    const p = prochaineServeur(items);
    prochaine.replaceChildren(`Prochaine sauvegarde automatique : ${Date.now() >= p.getTime() ? "à la prochaine ouverture du site" : fmtDate(p)}.`);
    if (!items.length) { liste.replaceChildren(h("p", { class: "note" }, "Aucune sauvegarde pour l'instant.")); return; }
    liste.replaceChildren(...items.map((b, i) => {
      const d = new Date(b.date);
      const bar = h("div", {});
      const btnDl = h("button", { class: "btn sm", title: "Télécharger cette sauvegarde (fichier JSON)", onclick: async () => {
        btnDl.disabled = true;
        try { await telechargerDepuisServeur(store, b.id); toast("Sauvegarde téléchargée"); }
        catch (e) { console.error(e); toast("Téléchargement impossible", "error"); }
        btnDl.disabled = false;
      } }, ico("download"), "Télécharger");
      const btnRest = h("button", { class: "btn sm", title: "Remettre les données dans cet état", onclick: async () => {
        const ok = await confirmer(`Restaurer la sauvegarde du ${fmtDate(d)} ?`,
          "Toutes les données actuelles seront remplacées par celles de cette sauvegarde. Par sécurité, l'état actuel est d'abord sauvegardé (« Avant restauration »), tu pourras donc revenir en arrière.",
          { ok: "Restaurer", danger: true });
        if (!ok) return;
        btnRest.disabled = btnDl.disabled = true;
        item.append(h("div", { class: "progress" }, bar));
        try {
          const r = await restaurer(store, b.id, (x) => { bar.style.width = `${Math.round(x * 100)}%`; });
          toast(`Restauration terminée (${fmt(r.ecrits)} éléments${r.supprimes ? `, ${r.supprimes} jour${r.supprimes > 1 ? "s" : ""} retiré${r.supprimes > 1 ? "s" : ""}` : ""})`);
          chargerListe();
        } catch (e) {
          console.error(e);
          toast("Échec de la restauration : les données n'ont pas toutes été remplacées. Réessayez.", "error");
          btnRest.disabled = btnDl.disabled = false;
        }
      } }, ico("upload"), "Restaurer");
      const item = h("div", { class: "backup", style: { animationDelay: `${i * 40}ms` } },
        h("div", { class: "backup-main" },
          h("div", {}, h("b", {}, fmtDate(d)), h("span", { class: "meta" }, ` à ${fmtHeure(d)}`)),
          h("div", { class: "meta" }, h("span", { class: `tag type-${b.type}` }, TYPES[b.type] || b.type), ` ${fmt(b.nb)} jours · ${fmt(Math.max(1, Math.round(b.taille / 1024)))} Ko`)),
        h("div", { class: "backup-actions" }, btnDl, btnRest));
      return item;
    }));
  }

  const btnServeur = h("button", { class: "btn primary", onclick: async () => {
    btnServeur.disabled = true;
    try {
      const s = await sauvegarderServeur(store, "manuelle");
      toast(`Sauvegarde enregistrée sur le serveur (${s.nb} jours)`);
      await nettoyerHistorique(store, await store.listerSauvegardes());
      await chargerListe();
    } catch (e) {
      console.error(e);
      toast(e?.code === "permission-denied" ? "Refusé par Firebase : mettez à jour les règles de sécurité." : "Sauvegarde impossible", "error");
    }
    btnServeur.disabled = false;
  } }, ico("shield"), "Sauvegarder maintenant");

  // ---------- Copie sur cet ordinateur ----------
  const etatLocal = h("p", { class: "note", style: { margin: "10px 0 0" } });
  const majLocal = () => {
    const d = derniereLocale();
    etatLocal.replaceChildren(d ? `Dernière copie sur cet ordinateur : ${fmtDate(new Date(d))}.` : "Aucune copie faite depuis cet ordinateur.");
  };
  const btnCopie = h("button", { class: "btn", onclick: async () => {
    btnCopie.disabled = true;
    try { await telechargerCopie(store); toast("Copie téléchargée"); majLocal(); }
    catch (e) { console.error(e); toast("Copie impossible", "error"); }
    btnCopie.disabled = false;
  } }, ico("download"), "Télécharger une copie");
  const caseAuto = h("input", { type: "checkbox", class: "switch", id: "auto-save", checked: autoLocaleActive(),
    onchange: () => { activerAutoLocale(caseAuto.checked); toast(caseAuto.checked ? "Copie mensuelle activée" : "Copie mensuelle désactivée"); } });
  majLocal();
  chargerListe();

  const email = auth.currentEmail?.() || "";
  page.append(h("div", { class: "grid settings stagger" },
    h("div", { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, "Sauvegardes sur le serveur"), h("span", { class: "hint" }, "1 an d'historique")),
      h("p", {}, "Une sauvegarde complète est enregistrée automatiquement chaque mois dans la base Firebase. Celles de plus d'un an sont supprimées automatiquement."),
      prochaine,
      h("div", { style: { marginBottom: "14px" } }, btnServeur),
      liste,
      h("div", { class: "divider" }),
      h("h3", { class: "sub-title" }, "Copie sur cet ordinateur"),
      h("p", {}, "En plus, un fichier à garder chez toi (clé USB, cloud) en cas de gros problème avec Firebase."),
      h("label", { class: "switch-row", for: "auto-save" }, caseAuto,
        h("span", {}, h("b", {}, "Télécharger aussi une copie chaque mois"), h("br"),
          h("span", { class: "note" }, "Dans le dossier Téléchargements, à l'ouverture du site sur l'ordinateur."))),
      btnCopie, etatLocal),
    h("div", { class: "grid", style: { alignContent: "start" } },
      h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Importer des données")),
        h("p", {}, "Pour charger un fichier de sauvegarde (ou les données de l'ancien fichier Excel). Les jours du fichier remplacent ceux des mêmes dates."),
        input, zone, result),
      h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Compte")),
        h("p", {}, "Connecté en tant que ", h("b", {}, email), "."),
        h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
          h("button", { class: "btn", onclick: async () => {
            try { await auth.resetPassword(email); toast("E-mail de changement de mot de passe envoyé"); }
            catch (e) { toast(auth.messageErreur(e), "error"); }
          } }, "Changer le mot de passe"),
          h("button", { class: "btn danger", onclick: () => auth.logout() }, ico("logout"), "Se déconnecter"))),
      h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Sécurité")),
        h("p", { style: { margin: 0 } }, h("span", { html: icon("shield").innerHTML, style: { display: "inline-flex", verticalAlign: "middle", marginRight: "6px", color: "var(--success)" } }),
          "Les données et les sauvegardes sont stockées dans Firebase et ne sont accessibles qu'à ce compte (règles Firestore). Le code du site est public, les données ne le sont pas.")))));
  return null;
}
