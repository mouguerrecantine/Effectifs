// Bilan de l'année civile (janvier → décembre) : repas, goûters, mercredis, vacances. Export Excel + impression PDF.
import { h, icon, fmt, toast } from "../ui.js";
import { MOIS, REPAS, GOUTERS, MERCREDI, VACANCES, PERIODES } from "../metier.js";
import { bilan } from "../calcul.js";
import { short } from "../dates.js";
import { kpi, vide } from "./commun.js";

const ONGLETS = [
  { k: "repas", l: "Repas", color: "--c-scolaire" },
  { k: "gouters", l: "Goûters", color: "--c-gouters" },
  { k: "mercredis", l: "Mercredis", color: "--c-mercredis" },
  { k: "vacances", l: "Vacances", color: "--c-vacances" },
];

const SC = "var(--c-scolaire)", MER = "var(--c-mercredis)", VAC = "var(--c-vacances)", GO = "var(--c-gouters)";
const PIQ = "var(--c-piquenique)", ENC = "var(--c-encadrement)";

/** Construit les tableaux (utilisés pour l'écran ET l'export Excel). */
function tableaux(b, data) {
  const t = b.totaux;
  const m = b.parMois;
  const repas = {
    head: ["Mois", "Jours écoles", ...REPAS.map((c) => c.l), "Total écoles", "Jours mercredis", "Repas mercredis", "Total période scolaire"],
    rows: MOIS.map((nom, i) => [nom, m[i].scolaire.jours, ...REPAS.map((c) => m[i].scolaire[c.k]), m[i].scolaire.repas,
      m[i].mercredis.jours, m[i].mercredis.repas, m[i].scolaire.repas + m[i].mercredis.repas]),
    foot: ["Total", t.joursScolaire, ...REPAS.map((c) => t.scolaire[c.k]), t.repasScolaire, t.joursMercredis, t.repasMercredis, t.repasPeriodeScolaire],
    totalCols: [6, 9],
    tints: [null, ...Array(5).fill(SC), null, MER, MER, null],
  };
  const gouters = {
    head: ["Mois", ...GOUTERS.map((c) => c.l), "Total écoles", "Mercredis", "Vacances", "Total"],
    rows: MOIS.map((nom, i) => [nom, ...GOUTERS.map((c) => m[i].scolaire[c.k]), m[i].scolaire.gouters, m[i].mercredis.gouters,
      m[i].vacances.gouters, m[i].scolaire.gouters + m[i].mercredis.gouters + m[i].vacances.gouters]),
    foot: ["Total", ...GOUTERS.map((c) => t.scolaire[c.k]), t.goutersScolaire, t.goutersMercredis, t.goutersVacances, t.goutersTotal],
    totalCols: [5, 8],
    tints: [null, GO, GO, GO, GO, null, MER, VAC, null],
  };
  const mercredis = {
    head: ["Mois", "Jours", ...MERCREDI.map((c) => c.l), "Total repas", "Goûters"],
    rows: MOIS.map((nom, i) => [nom, m[i].mercredis.jours, ...MERCREDI.map((c) => m[i].mercredis[c.k]), m[i].mercredis.repas, m[i].mercredis.gouters]),
    foot: ["Total", t.joursMercredis, ...MERCREDI.map((c) => t.mercredis[c.k]), t.repasMercredis, t.goutersMercredis],
    totalCols: [7],
    tints: [null, MER, MER, MER, MER, ENC, ENC, null, GO],
  };
  const vacances = {
    head: ["Période", "Dates", "Jours", ...VACANCES.map((c) => c.l), "Total repas", "Goûters"],
    rows: PERIODES.map((p) => {
      const v = b.parPeriode[p.k];
      const per = data.periodes.find((x) => x.periode === p.k);
      return [p.l, per ? `${short(per.debut)} → ${short(per.fin)}` : "—", v.jours, ...VACANCES.map((c) => v[c.k]), v.repas, v.gouters];
    }),
    foot: ["Total", "", t.joursVacances, ...VACANCES.map((c) => t.vacances[c.k]), t.repasVacances, t.goutersVacances],
    totalCols: [11],
    tints: [null, null, VAC, VAC, VAC, VAC, VAC, PIQ, PIQ, ENC, ENC, null, GO],
  };
  return { repas, gouters, mercredis, vacances };
}

function table({ head, rows, foot, totalCols, tints = [] }) {
  const isNum = (v) => typeof v === "number";
  const rang = head.map((_, j) => { let n = 0; while (j - n - 1 >= 0 && tints[j - n - 1] && tints[j - n - 1] === tints[j]) n++; return n; });
  const attrs = (j) => ({
    class: [totalCols.includes(j) ? "total" : "", tints[j] ? "tinted" : "", tints[j] && rang[j] % 2 ? "alt" : "",
      j && tints[j] !== tints[j - 1] ? "sep" : ""].join(" "),
    style: tints[j] ? { "--tint": tints[j] } : {},
  });
  const cell = (tag, v, j) => h(tag, attrs(j), isNum(v) ? fmt(v) : v);
  return h("div", { class: "table-wrap" }, h("table", { class: "grid-table bilan-table" },
    h("thead", {}, h("tr", {}, head.map((x, j) => h("th", attrs(j), x)))),
    h("tbody", {}, rows.map((r, i) => h("tr", { class: r.slice(1).every((v) => !isNum(v) || v === 0) ? "empty" : "", style: { animationDelay: `${i * 25}ms` } },
      r.map((v, j) => cell("td", v, j))))),
    h("tfoot", {}, h("tr", {}, foot.map((v, j) => cell("td", v, j))))));
}

async function exportExcel(year, tabs, b) {
  if (!window.XLSX) {
    await new Promise((ok, ko) => document.head.append(h("script", { src: "js/vendor/xlsx.full.min.js", onload: ok, onerror: ko })));
  }
  const X = window.XLSX;
  const wb = X.utils.book_new();
  const t = b.totaux;
  const synthese = [
    [`Bilan ${year}`], [],
    ["Indicateur", "Valeur"],
    ["Repas écoles", t.repasScolaire], ["Jours travaillés écoles", t.joursScolaire], ["Moyenne repas / jour (écoles)", +t.moyenneScolaire.toFixed(1)],
    ["Repas mercredis", t.repasMercredis], ["Mercredis travaillés", t.joursMercredis],
    ["Total période scolaire (écoles + mercredis)", t.repasPeriodeScolaire], ["Moyenne repas / jour (mercredis inclus)", +t.moyennePeriodeScolaire.toFixed(1)],
    ["Repas vacances", t.repasVacances], ["Jours travaillés vacances", t.joursVacances], ["Moyenne repas / jour (vacances)", +t.moyenneVacances.toFixed(1)],
    ["Total repas (toutes activités)", t.repasTotal],
    ["Goûters écoles", t.goutersScolaire], ["Moyenne goûters / jour (écoles)", +t.moyenneGouters.toFixed(1)],
    ["Goûters mercredis", t.goutersMercredis], ["Goûters vacances", t.goutersVacances], ["Total goûters", t.goutersTotal],
  ];
  const ws0 = X.utils.aoa_to_sheet(synthese);
  ws0["!cols"] = [{ wch: 46 }, { wch: 12 }];
  X.utils.book_append_sheet(wb, ws0, "Synthèse");
  for (const o of ONGLETS) {
    const tb = tabs[o.k];
    const ws = X.utils.aoa_to_sheet([tb.head, ...tb.rows, tb.foot]);
    ws["!cols"] = tb.head.map((x, j) => ({ wch: j === 0 ? 14 : Math.max(10, x.length + 2) }));
    X.utils.book_append_sheet(wb, ws, o.l);
  }
  X.writeFile(wb, `Bilan_effectifs_${year}.xlsx`);
}

export function render(page, { year, data, setSubtitle }) {
  const b = bilan(data);
  const t = b.totaux;
  setSubtitle(`Année civile ${year} — du 1er janvier au 31 décembre`);
  if (!t.joursTotal) {
    page.append(vide(`Pas encore de données pour ${year}`, "Le bilan se remplit automatiquement au fil de la saisie.", "bilan"));
    return null;
  }
  const tabs = tableaux(b, data);

  const sections = {
    repas: [
      h("div", { class: "grid kpis stagger" },
        kpi({ label: "Repas écoles", value: t.repasScolaire, ico: "repas", color: "--c-scolaire", foot: `${t.joursScolaire} jours · ${fmt(t.moyenneScolaire, 1)} / jour` }),
        kpi({ label: "Repas mercredis", value: t.repasMercredis, ico: "mercredi", color: "--c-mercredis", foot: `${t.joursMercredis} mercredis · ${fmt(t.moyenneMercredis, 1)} / jour` }),
        kpi({ label: "Total période scolaire", value: t.repasPeriodeScolaire, ico: "trend", color: "--c-scolaire", foot: `${t.joursPeriodeScolaire} jours (mercredis inclus) · ${fmt(t.moyennePeriodeScolaire, 1)} / jour` }),
        kpi({ label: "Total toutes activités", value: t.repasTotal, ico: "users", color: "--c-vacances", foot: `dont ${fmt(t.repasVacances)} en vacances` })),
      table(tabs.repas)],
    gouters: [
      h("div", { class: "grid kpis stagger" },
        kpi({ label: "Goûters écoles", value: t.goutersScolaire, ico: "gouter", color: "--c-gouters", foot: `${fmt(t.moyenneGouters, 1)} / jour d'école` }),
        kpi({ label: "Goûters mercredis", value: t.goutersMercredis, ico: "mercredi", color: "--c-mercredis" }),
        kpi({ label: "Goûters vacances", value: t.goutersVacances, ico: "vacances", color: "--c-vacances" }),
        kpi({ label: "Total goûters", value: t.goutersTotal, ico: "trend", color: "--c-gouters" })),
      table(tabs.gouters)],
    mercredis: [
      h("div", { class: "grid kpis stagger" },
        kpi({ label: "Mercredis travaillés", value: t.joursMercredis, ico: "calendar", color: "--c-mercredis" }),
        kpi({ label: "Total repas", value: t.repasMercredis, ico: "repas", color: "--c-mercredis" }),
        kpi({ label: "Moyenne repas / mercredi", value: t.moyenneMercredis, dec: 1, ico: "trend", color: "--c-mercredis" }),
        kpi({ label: "Goûters", value: t.goutersMercredis, ico: "gouter", color: "--c-gouters" })),
      table(tabs.mercredis)],
    vacances: [
      h("div", { class: "grid kpis stagger" },
        kpi({ label: "Jours travaillés", value: t.joursVacances, ico: "calendar", color: "--c-vacances" }),
        kpi({ label: "Total repas", value: t.repasVacances, ico: "repas", color: "--c-vacances" }),
        kpi({ label: "Moyenne repas / jour", value: t.moyenneVacances, dec: 1, ico: "trend", color: "--c-vacances" }),
        kpi({ label: "Goûters", value: t.goutersVacances, ico: "gouter", color: "--c-gouters" })),
      table(tabs.vacances)],
  };

  const els = {};
  const chips = {};
  let actif = "repas";
  const choisir = (k) => {
    actif = k;
    for (const o of ONGLETS) { els[o.k].classList.toggle("active", o.k === k); chips[o.k].classList.toggle("active", o.k === k); }
  };
  for (const o of ONGLETS) {
    chips[o.k] = h("button", { class: "chip", onclick: () => choisir(o.k) }, o.l);
    els[o.k] = h("section", { class: "bilan-section" },
      h("h2", { class: "section-title" }, h("span", { class: "sw", style: { background: `var(${o.color})` } }), `${o.l} — ${year}`),
      sections[o.k]);
  }

  const btnXls = h("button", { class: "btn", onclick: async () => {
    btnXls.disabled = true;
    try { await exportExcel(year, tabs, b); toast("Fichier Excel téléchargé"); }
    catch (e) { console.error(e); toast("Export Excel impossible", "error"); }
    btnXls.disabled = false;
  } }, h("span", { html: icon("excel").innerHTML, style: { display: "inline-flex" } }), "Exporter Excel");

  page.append(
    h("div", { class: "toolbar no-print" }, h("div", { class: "chips" }, ONGLETS.map((o) => chips[o.k])),
      h("div", { style: { display: "flex", gap: "8px" } }, btnXls,
        h("button", { class: "btn", onclick: () => window.print() }, h("span", { html: icon("print").innerHTML, style: { display: "inline-flex" } }), "Imprimer / PDF"))),
    ...ONGLETS.map((o) => els[o.k]));
  choisir(actif);
  return null;
}
