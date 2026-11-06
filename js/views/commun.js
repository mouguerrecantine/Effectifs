// Éléments partagés par les pages.
import { h, icon, countUp, cssVar, fmt } from "../ui.js";
import { MOIS_COURT } from "../metier.js";

/** Carte indicateur animée. */
export function kpi({ label, value, dec = 0, ico, color = "--primary", foot }) {
  const v = h("div", { class: "value" }, "0");
  const card = h("div", { class: "card kpi", style: { "--accent": `var(${color})` } },
    h("div", { class: "label" },
      ico ? h("span", { class: "ico", style: { background: `color-mix(in srgb, var(${color}) 14%, transparent)`, color: `var(${color})` }, html: icon(ico).innerHTML }) : null,
      label),
    v, foot ? h("div", { class: "foot" }, foot) : null);
  countUp(v, value, dec);
  let first = true; // 1re valeur : animée ; ensuite (saisie en direct) : immédiate
  card.set = (n) => {
    if (first) { first = false; countUp(v, n, dec); return; }
    cancelAnimationFrame(v._raf);
    v.textContent = fmt(n, dec);
  };
  return card;
}

/** Pastilles de mois (janvier → décembre). */
export function moisChips(selected, onPick, hasData = () => false) {
  return h("div", { class: "chips", role: "tablist" }, MOIS_COURT.map((m, i) =>
    h("button", { class: `chip ${i === selected ? "active" : ""} ${hasData(i) ? "has-data" : ""}`, role: "tab",
      "aria-selected": String(i === selected), onclick: () => onPick(i) }, m)));
}

/** Mois proposé par défaut : mois courant pour l'année en cours, sinon dernier mois saisi (ou janvier). */
export function moisParDefaut(year, rows) {
  const now = new Date();
  if (year === now.getFullYear()) return now.getMonth();
  const last = rows.at(-1);
  return last ? Number(last.date.slice(5, 7)) - 1 : 0;
}

export const couleur = (v) => cssVar(v);

export function vide(titre, texte, ico = "calendar", action = null) {
  return h("div", { class: "card empty" }, h("div", { class: "ico", html: icon(ico).innerHTML }), h("h3", {}, titre), h("p", {}, texte), action);
}
