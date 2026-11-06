// Saisie journalière des repas et goûters des écoles (lun, mar, jeu, ven).
import { h } from "../ui.js";
import { REPAS, GOUTERS } from "../metier.js";
import { daysOfMonth, ferie } from "../dates.js";
import { repasScolaire, goutersScolaire } from "../calcul.js";
import { createGrid } from "../grille.js";
import { kpi, moisChips, moisParDefaut } from "./commun.js";

export function render(page, { year, data, store, setSubtitle }) {
  let mois = moisParDefaut(year, data.scolaire);
  let grid = null;
  const zone = h("div", {});
  const head = h("div", {});
  page.append(head, zone);
  setSubtitle("Saisie journalière des écoles — un jour rempli compte automatiquement comme travaillé");

  function vacancesDe(date) {
    return data.periodes.find((p) => date >= p.debut && date <= p.fin);
  }

  async function show(m) {
    if (grid) await grid.flush();
    mois = m;
    const prefix = `${year}-${String(m + 1).padStart(2, "0")}`;
    const saisis = data.scolaire.filter((d) => d.date.startsWith(prefix));
    const dates = [...new Set([...daysOfMonth(year, m, [1, 2, 4, 5]), ...saisis.map((d) => d.date)])].sort();
    const rows = dates.map((date) => {
      const f = ferie(date), v = vacancesDe(date);
      return { date, values: saisis.find((d) => d.date === date) || null, tag: f || (v ? "Vacances" : null), muted: !!(f || v) };
    });

    const kJours = kpi({ label: "Jours travaillés", value: 0, ico: "calendar", color: "--c-scolaire" });
    const kRepas = kpi({ label: "Repas du mois", value: 0, ico: "repas", color: "--c-scolaire" });
    const kMoy = kpi({ label: "Moyenne repas / jour", value: 0, dec: 1, ico: "trend", color: "--c-scolaire" });
    const kGout = kpi({ label: "Goûters du mois", value: 0, ico: "gouter", color: "--c-gouters" });

    grid = createGrid({
      groups: { Repas: "var(--c-scolaire)", "Goûters": "var(--c-gouters)" },
      cols: [
        ...REPAS.map((c) => ({ ...c, group: "Repas" })), { l: "Total", group: "Repas", total: repasScolaire },
        ...GOUTERS.map((c) => ({ ...c, group: "Goûters" })), { l: "Total", group: "Goûters", total: goutersScolaire },
      ],
      rows,
      onSave: (date, values) => store.saveDay("scolaire", date, values),
      onChange: (done) => {
        const repas = done.reduce((a, d) => a + repasScolaire(d), 0);
        kJours.set(done.length); kRepas.set(repas); kMoy.set(done.length ? repas / done.length : 0);
        kGout.set(done.reduce((a, d) => a + goutersScolaire(d), 0));
      },
    });

    head.replaceChildren(
      h("div", { class: "toolbar" }, moisChips(m, show, (i) => data.scolaire.some((d) => d.date.startsWith(`${year}-${String(i + 1).padStart(2, "0")}`)))),
      h("div", { class: "grid kpis stagger" }, kJours, kRepas, kMoy, kGout));
    zone.replaceChildren(grid.el, h("p", { class: "note" }, "Astuce : Entrée ou ↓ pour passer à la ligne suivante, ← → pour changer de colonne. L'enregistrement est automatique."));
  }

  show(mois);
  return { flush: () => grid?.flush(), pending: () => grid?.pending() };
}
