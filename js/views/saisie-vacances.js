// Saisie des vacances : choisir la période, fixer ses dates une fois, puis saisir jour par jour.
import { h, icon, toast } from "../ui.js";
import { VACANCES, PERIODES } from "../metier.js";
import { weekdaysBetween, ferie, short, today } from "../dates.js";
import { repasVacances, goutersVacances } from "../calcul.js";
import { createGrid } from "../grille.js";
import { kpi, vide } from "./commun.js";

export function render(page, { year, data, store, setSubtitle }) {
  let grid = null;
  const head = h("div", {}), zone = h("div", {});
  page.append(head, zone);
  setSubtitle("Accueil des vacances — Hiver, Printemps, Juillet, Août, Toussaint");

  const periodeDe = (k) => data.periodes.find((p) => p.periode === k);
  const defaut = () => {
    const t = today();
    const enCours = data.periodes.find((p) => t >= p.debut && t <= p.fin);
    if (enCours) return enCours.periode;
    const derniere = [...data.periodes].sort((a, b) => (a.debut < b.debut ? 1 : -1))[0];
    return derniere?.periode || "hiver";
  };

  function formDates(k, p, onDone) {
    const debut = h("input", { class: "input", type: "date", value: p?.debut || "", min: `${year}-01-01`, max: `${year}-12-31` });
    const fin = h("input", { class: "input", type: "date", value: p?.fin || "", min: `${year}-01-01`, max: `${year}-12-31` });
    const btn = h("button", { class: "btn primary", type: "submit" }, "Valider les dates");
    return h("form", { class: "period-form", onsubmit: async (e) => {
      e.preventDefault();
      if (!debut.value || !fin.value || fin.value < debut.value) return toast("Indiquez une date de début et une date de fin valides.", "error");
      if (fin.value.slice(0, 4) !== String(year) || debut.value.slice(0, 4) !== String(year)) return toast(`Les dates doivent être en ${year}.`, "error");
      btn.disabled = true;
      try { await store.savePeriode(year, k, debut.value, fin.value); toast("Dates enregistrées"); onDone(); }
      catch (err) { console.error(err); toast("Impossible d'enregistrer les dates.", "error"); btn.disabled = false; }
    } },
    h("div", { class: "field" }, h("label", {}, "Premier jour"), debut),
    h("div", { class: "field" }, h("label", {}, "Dernier jour"), fin), btn);
  }

  async function show(k, editer = false) {
    if (grid) { await grid.flush(); grid = null; }
    const p = periodeDe(k);
    const lib = PERIODES.find((x) => x.k === k).l;
    const chips = h("div", { class: "chips", role: "tablist" }, PERIODES.map((x) =>
      h("button", { class: `chip ${x.k === k ? "active" : ""} ${data.vacances.some((d) => d.periode === x.k) ? "has-data" : ""}`, role: "tab",
        onclick: () => show(x.k) }, x.l)));

    if (!p || editer) {
      head.replaceChildren(h("div", { class: "toolbar" }, chips));
      zone.replaceChildren(vide(
        editer ? `Modifier les dates — vacances de ${lib} ${year}` : `Vacances de ${lib} ${year}`,
        "Indiquez le premier et le dernier jour d'ouverture : les jours de semaine seront préparés automatiquement.",
        "vacances", formDates(k, p, () => show(k))));
      zone.querySelector(".period-form").style.justifyContent = "center";
      return;
    }

    const saisis = data.vacances.filter((d) => d.periode === k);
    const dates = [...new Set([...weekdaysBetween(p.debut, p.fin), ...saisis.map((d) => d.date)])].sort();
    const rows = dates.map((date) => ({ date, values: saisis.find((d) => d.date === date) || null, tag: ferie(date), muted: !!ferie(date) }));

    const kJours = kpi({ label: "Jours travaillés", value: 0, ico: "calendar", color: "--c-vacances" });
    const kRepas = kpi({ label: "Repas de la période", value: 0, ico: "repas", color: "--c-vacances" });
    const kMoy = kpi({ label: "Moyenne repas / jour", value: 0, dec: 1, ico: "trend", color: "--c-vacances" });
    const kGout = kpi({ label: "Goûters", value: 0, ico: "gouter", color: "--c-gouters" });

    grid = createGrid({
      groups: { Enfants: "var(--c-vacances)", "Pique-nique": "var(--c-gouters)", Encadrement: "var(--faint)", "": "var(--border)" },
      cols: [
        ...VACANCES.slice(0, 4).map((c) => ({ ...c, group: "Enfants" })),
        { ...VACANCES[4], l: "Enfants", group: "Pique-nique" }, { ...VACANCES[5], l: "Adultes", group: "Pique-nique" },
        ...VACANCES.slice(6).map((c) => ({ ...c, group: "Encadrement" })),
        { l: "Total repas", group: "", total: repasVacances },
      ],
      rows,
      onSave: (date, values) => store.saveDay("vacances", date, values, { periode: k }),
      onChange: (done) => {
        const repas = done.reduce((a, d) => a + repasVacances(d), 0);
        kJours.set(done.length); kRepas.set(repas); kMoy.set(done.length ? repas / done.length : 0);
        kGout.set(done.reduce((a, d) => a + goutersVacances(d), 0));
      },
    });

    head.replaceChildren(
      h("div", { class: "toolbar" }, chips,
        h("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
          h("span", { class: "tag" }, h("span", { class: "sw", style: { background: "var(--c-vacances)" } }), `Du ${short(p.debut)} au ${short(p.fin)}`),
          h("button", { class: "btn", onclick: () => show(k, true) }, h("span", { html: icon("edit").innerHTML, style: { display: "inline-flex" } }), "Modifier les dates"))),
      h("div", { class: "grid kpis stagger" }, kJours, kRepas, kMoy, kGout));
    zone.replaceChildren(grid.el, h("p", { class: "note" }, "Goûters des vacances = Poussins + Jaguars + Cobra + Passerelle (règle du fichier Excel)."));
  }

  show(defaut());
  return { flush: () => grid?.flush(), pending: () => grid?.pending() };
}
