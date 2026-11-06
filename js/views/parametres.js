// Paramètres : import des données (Excel historique / sauvegarde), sauvegarde, compte.
import { h, icon, toast, confirmer, fmt } from "../ui.js";
import { KEYS, PERIODES } from "../metier.js";
import { long } from "../dates.js";
import { telechargerSauvegarde, derniereSauvegarde, autoActive, activerAuto, prochaineSauvegarde } from "../sauvegarde.js";

const DATE = /^20\d\d-[01]\d-[0-3]\d$/;

function valider(json) {
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
  const etat = h("p", { class: "note", style: { margin: "12px 0 0" } });
  const majEtat = () => {
    const d = derniereSauvegarde();
    etat.replaceChildren(
      d ? `Dernière sauvegarde sur cet ordinateur : ${fmtDate(new Date(d))}.` : "Aucune sauvegarde faite depuis cet ordinateur.",
      autoActive() ? ` Prochaine sauvegarde automatique : ${Date.now() >= prochaineSauvegarde().getTime() ? "à la prochaine ouverture du site" : fmtDate(prochaineSauvegarde())}.` : "");
  };
  const btnSave = h("button", { class: "btn", onclick: async () => {
    btnSave.disabled = true;
    try { await telechargerSauvegarde(store); toast("Sauvegarde téléchargée"); majEtat(); }
    catch (e) { console.error(e); toast("Sauvegarde impossible", "error"); }
    btnSave.disabled = false;
  } }, h("span", { html: icon("download").innerHTML, style: { display: "inline-flex" } }), "Télécharger maintenant");
  const caseAuto = h("input", { type: "checkbox", class: "switch", id: "auto-save", checked: autoActive(),
    onchange: () => { activerAuto(caseAuto.checked); majEtat(); toast(caseAuto.checked ? "Sauvegarde automatique activée" : "Sauvegarde automatique désactivée"); } });
  majEtat();

  const email = auth.currentEmail?.() || "";
  page.append(h("div", { class: "grid settings stagger" },
    h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Importer des données")),
      h("p", {}, "Pour charger les données de l'ancien fichier Excel (fichier « donnees-initiales.json ») ou restaurer une sauvegarde."),
      input, zone, result),
    h("div", { class: "grid" },
      h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Sauvegarde")),
        h("p", {}, "Un fichier avec toutes les données (toutes années), à garder en lieu sûr. Il se restaure avec « Importer des données »."),
        h("label", { class: "switch-row", for: "auto-save" }, caseAuto,
          h("span", {}, h("b", {}, "Sauvegarde automatique tous les mois"), h("br"),
            h("span", { class: "note" }, "Téléchargée toute seule à l'ouverture du site sur l'ordinateur, tous les 30 jours."))),
        btnSave, etat),
      h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Compte")),
        h("p", {}, "Connecté en tant que ", h("b", {}, email), "."),
        h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
          h("button", { class: "btn", onclick: async () => {
            try { await auth.resetPassword(email); toast("E-mail de changement de mot de passe envoyé"); }
            catch (e) { toast(auth.messageErreur(e), "error"); }
          } }, "Changer le mot de passe"),
          h("button", { class: "btn danger", onclick: () => auth.logout() }, h("span", { html: icon("logout").innerHTML, style: { display: "inline-flex" } }), "Se déconnecter"))),
      h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Sécurité")),
        h("p", { style: { margin: 0 } }, h("span", { html: icon("shield").innerHTML, style: { display: "inline-flex", verticalAlign: "middle", marginRight: "6px", color: "var(--success)" } }),
          "Les données sont stockées dans Firebase et ne sont accessibles qu'à ce compte (règles Firestore). Le code du site est public, les données ne le sont pas.")))));
  return null;
}
