// Tableau de bord de l'année : indicateurs, comparaison avec l'année précédente, graphique mensuel.
import { h, fmt, cssVar } from "../ui.js";
import { MOIS_COURT, REPAS } from "../metier.js";
import { bilan, jusqua, variation, repasScolaire, repasMercredi, repasVacances } from "../calcul.js";
import { long, short, today } from "../dates.js";
import { kpi, vide } from "./commun.js";

export async function render(page, { year, data, store, setSubtitle }) {
  const prev = await store.loadYear(year - 1).catch(() => null);
  const enCours = year === new Date().getFullYear();
  const mmjj = enCours ? today().slice(5) : null;
  const b = bilan(data);
  const t = b.totaux;
  const tp = prev ? bilan(jusqua(prev, mmjj)).totaux : null;
  const bPrev = prev ? bilan(prev) : null;

  const derniers = [
    ...data.scolaire.map((d) => ({ date: d.date, type: "Écoles", color: "--c-scolaire", n: repasScolaire(d), href: "#/repas" })),
    ...data.mercredis.map((d) => ({ date: d.date, type: "Mercredi", color: "--c-mercredis", n: repasMercredi(d), href: "#/mercredis" })),
    ...data.vacances.map((d) => ({ date: d.date, type: "Vacances", color: "--c-vacances", n: repasVacances(d), href: "#/vacances" })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  setSubtitle(derniers.length ? `Données saisies jusqu'au ${long(derniers[0].date)}` : `Aucune donnée pour ${year}`);

  if (!derniers.length) {
    page.append(vide(`Aucune saisie en ${year}`, "Commencez par la saisie des repas, des mercredis ou des vacances.", "calendar",
      h("a", { class: "btn primary", href: "#/repas" }, "Commencer la saisie")));
    return null;
  }

  const delta = (now, before) => {
    const v = variation(now, before);
    if (v == null) return null;
    const cls = Math.abs(v) < 0.5 ? "flat" : v > 0 ? "up" : "down";
    return [h("span", { class: `delta ${cls}` }, `${v > 0 ? "+" : ""}${fmt(v, 1)} %`), ` vs ${year - 1}${enCours ? " à date" : ""}`];
  };

  page.append(h("div", { class: "grid kpis stagger" },
    kpi({ label: "Repas servis", value: t.repasTotal, ico: "repas", color: "--c-scolaire", foot: delta(t.repasTotal, tp?.repasTotal) || "Écoles, mercredis et vacances" }),
    kpi({ label: "Goûters", value: t.goutersTotal, ico: "gouter", color: "--c-gouters", foot: delta(t.goutersTotal, tp?.goutersTotal) || "Écoles, mercredis et vacances" }),
    kpi({ label: "Jours travaillés", value: t.joursTotal, ico: "calendar", color: "--c-mercredis",
      foot: `${t.joursScolaire} écoles · ${t.joursMercredis} mer. · ${t.joursVacances} vac.` }),
    kpi({ label: "Moyenne repas / jour", value: t.moyennePeriodeScolaire, dec: 1, ico: "trend", color: "--c-vacances",
      foot: delta(t.moyennePeriodeScolaire, tp?.moyennePeriodeScolaire) || "Période scolaire, mercredis inclus" })));

  // Graphique
  const canvas = h("canvas", { "aria-label": "Repas par mois" });
  const ecoles = REPAS.map((c) => ({ ...c, n: t.scolaire[c.k] }));
  const maxEcole = Math.max(1, ...ecoles.map((e) => e.n));
  const bars = h("div", { class: "bars" }, ecoles.map((e) => {
    const fill = h("div", { class: "bar-fill", style: { background: "var(--c-scolaire)" } });
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = `${(e.n / maxEcole) * 100}%`; }));
    return h("div", { class: "bar-row" }, h("div", { class: "top" }, h("b", {}, e.l), h("span", {}, fmt(e.n))), h("div", { class: "bar-track" }, fill));
  }));
  const repart = [
    { l: "Écoles", n: t.repasScolaire, c: "--c-scolaire" }, { l: "Mercredis", n: t.repasMercredis, c: "--c-mercredis" },
    { l: "Vacances", n: t.repasVacances, c: "--c-vacances" },
  ];

  page.append(h("div", { class: "grid dash-grid stagger", style: { marginBottom: "16px" } },
    h("div", { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, "Repas par mois"),
        h("div", { class: "chips" }, repart.map((r) => h("span", { class: "tag" }, h("span", { class: "sw", style: { background: `var(${r.c})` } }), r.l)),
          bPrev ? h("span", { class: "tag" }, h("span", { class: "sw", style: { background: "var(--faint)" } }), String(year - 1)) : null)),
      h("div", { class: "chart-box" }, canvas)),
    h("div", { class: "grid" },
      h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Repas par école"), h("span", { class: "hint" }, "année " + year)), bars),
      h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, "Répartition")),
        h("div", { class: "list" }, repart.map((r) => h("div", { class: "list-item" },
          h("span", { class: "tag" }, h("span", { class: "sw", style: { background: `var(${r.c})` } }), r.l),
          h("b", {}, `${fmt(r.n)} · ${fmt(t.repasTotal ? (r.n / t.repasTotal) * 100 : 0, 1)} %`))))))));

  page.append(h("div", { class: "card stagger" },
    h("div", { class: "card-head" }, h("h2", {}, "Dernières saisies"), h("a", { href: "#/bilan", class: "hint" }, "Voir le bilan complet →")),
    h("div", { class: "list" }, derniers.slice(0, 6).map((d) => h("a", { class: "list-item", href: d.href, style: { color: "inherit" } },
      h("div", {}, h("b", {}, short(d.date)), " ", h("span", { class: "tag", style: { marginLeft: "8px" } }, h("span", { class: "sw", style: { background: `var(${d.color})` } }), d.type)),
      h("span", { class: "meta" }, `${fmt(d.n)} repas`))))));

  let chart = null;
  if (window.Chart) {
    const grid = cssVar("--border"), txt = cssVar("--muted");
    const ds = (label, key, c) => ({ label, data: b.parMois.map((m) => m[key].repas), backgroundColor: cssVar(c), borderRadius: 6, stack: "a", maxBarThickness: 34 });
    chart = new window.Chart(canvas, {
      type: "bar",
      data: {
        labels: MOIS_COURT,
        datasets: [
          ds("Écoles", "scolaire", "--c-scolaire"), ds("Mercredis", "mercredis", "--c-mercredis"), ds("Vacances", "vacances", "--c-vacances"),
          ...(bPrev ? [{ type: "line", label: `Total ${year - 1}`, data: bPrev.parMois.map((m) => m.scolaire.repas + m.mercredis.repas + m.vacances.repas),
            borderColor: cssVar("--faint"), borderDash: [5, 5], borderWidth: 2, pointRadius: 0, tension: .35 }] : []),
        ],
      },
      options: {
        maintainAspectRatio: false, animation: { duration: 900, easing: "easeOutQuart" },
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label} : ${fmt(c.raw)}` } } },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: txt } },
          y: { stacked: true, grid: { color: grid }, border: { display: false }, ticks: { color: txt, callback: (v) => fmt(v) } },
        },
      },
    });
  }
  return { destroy: () => chart?.destroy() };
}
