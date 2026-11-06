// Saisie des mercredis (accueil de loisirs).
import { h } from "../ui.js";
import { MERCREDI } from "../metier.js";
import { daysOfMonth, ferie } from "../dates.js";
import { repasMercredi, goutersMercredi } from "../calcul.js";
import { createGrid } from "../grille.js";
import { kpi, moisChips, moisParDefaut } from "./commun.js";

export function render(page, { year, data, store, setSubtitle }) {
  let grid = null;
  const head = h("div", {}), zone = h("div", {});
  page.append(head, zone);
  setSubtitle("Accueil du mercredi — saisie par groupe");

  async function show(m) {
    if (grid) await grid.flush();
    const prefix = `${year}-${String(m + 1).padStart(2, "0")}`;
    const saisis = data.mercredis.filter((d) => d.date.startsWith(prefix));
    const dates = [...new Set([...daysOfMonth(year, m, [3]), ...saisis.map((d) => d.date)])].sort();
    const rows = dates.map((date) => {
      const f = ferie(date), v = data.periodes.find((p) => date >= p.debut && date <= p.fin);
      return { date, values: saisis.find((d) => d.date === date) || null, tag: f || (v ? "Vacances" : null), muted: !!(f || v) };
    });

    const kJours = kpi({ label: "Mercredis travaillés", value: 0, ico: "calendar", color: "--c-mercredis" });
    const kRepas = kpi({ label: "Repas du mois", value: 0, ico: "repas", color: "--c-mercredis" });
    const kMoy = kpi({ label: "Moyenne repas / mercredi", value: 0, dec: 1, ico: "trend", color: "--c-mercredis" });
    const kGout = kpi({ label: "Goûters du mois", value: 0, ico: "gouter", color: "--c-gouters" });

    grid = createGrid({
      groups: { Enfants: "var(--c-mercredis)", Encadrement: "var(--c-encadrement)", "Goûters": "var(--c-gouters)" },
      cols: [
        ...MERCREDI.slice(0, 3).map((c) => ({ ...c, group: "Enfants" })),
        ...MERCREDI.slice(3).map((c) => ({ ...c, group: "Encadrement" })),
        { l: "Total repas", group: "", total: repasMercredi },
        { l: "Calculés", group: "Goûters", total: goutersMercredi, soft: true },
      ],
      rows,
      onSave: (date, values) => store.saveDay("mercredis", date, values),
      onChange: (done) => {
        const repas = done.reduce((a, d) => a + repasMercredi(d), 0);
        kJours.set(done.length); kRepas.set(repas); kMoy.set(done.length ? repas / done.length : 0);
        kGout.set(done.reduce((a, d) => a + goutersMercredi(d), 0));
      },
    });

    head.replaceChildren(
      h("div", { class: "toolbar" }, moisChips(m, show, (i) => data.mercredis.some((d) => d.date.startsWith(`${year}-${String(i + 1).padStart(2, "0")}`)))),
      h("div", { class: "grid kpis stagger" }, kJours, kRepas, kMoy, kGout));
    zone.replaceChildren(grid.el, h("p", { class: "note" }, "Goûters du mercredi = Poussins + Jaguars + Cobra + Animateurs (règle du fichier Excel)."));
  }

  show(moisParDefaut(year, data.mercredis));
  return { flush: () => grid?.flush(), pending: () => grid?.pending() };
}
