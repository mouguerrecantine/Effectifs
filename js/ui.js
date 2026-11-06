// Petits outils d'interface : création d'éléments (sans innerHTML pour les données), icônes, notifications…

/** h("div", {class: "x", onclick: fn}, enfant1, "texte"…) — le texte est toujours inséré comme texte. */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") {
      for (const [p, val] of Object.entries(v)) p.startsWith("--") ? el.style.setProperty(p, val) : (el.style[p] = val);
    }
    else if (k === "html") el.innerHTML = v; // réservé aux icônes SVG constantes du code
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICONS = {
  logo: P('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),
  dashboard: P('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  bilan: P('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 17v-3M12 17v-6M16 17v-4"/>'),
  repas: P('<path d="M4 3v7a3 3 0 0 0 3 3v8"/><path d="M10 3v7a3 3 0 0 1-3 3"/><path d="M7 3v5"/><path d="M17 21V3c-2 1-3.5 3.5-3.5 7s1.5 4 3.5 4"/>'),
  mercredi: P('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M10 15h4"/>'),
  vacances: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  gouter: P('<path d="M12 2a4 4 0 0 0-4 4c0 1 .3 1.6.6 2H7a3 3 0 0 0 0 6h.2l1.3 7h7l1.3-7h.2a3 3 0 0 0 0-6h-1.6c.3-.4.6-1 .6-2a4 4 0 0 0-4-4z"/>'),
  settings: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  logout: P('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>'),
  left: P('<path d="M15 18l-6-6 6-6"/>'),
  right: P('<path d="M9 18l6-6-6-6"/>'),
  check: P('<path d="M20 6L9 17l-5-5"/>'),
  alert: P('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'),
  eye: P('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: P('<path d="M17.9 17.9A10.9 10.9 0 0 1 12 20c-7 0-11-8-11-8a19.8 19.8 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a19.5 19.5 0 0 1-2.2 3.2M1 1l22 22"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/>'),
  download: P('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>'),
  upload: P('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>'),
  print: P('<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'),
  excel: P('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M9 13l6 6M15 13l-6 6"/>'),
  calendar: P('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  edit: P('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  users: P('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
  trend: P('<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>'),
  shield: P('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
};
export const icon = (name, cls = "") => h("span", { class: `i ${cls}`, html: ICONS[name] || "", style: { display: "inline-flex" } });

const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmt = (n, dec = 0) => (dec ? nf1 : nf0).format(n || 0);

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Anime un nombre de 0 à `value`. */
export function countUp(el, value, dec = 0, duration = 900) {
  cancelAnimationFrame(el._raf);
  if (reduced()) { el.textContent = fmt(value, dec); return; }
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(value * e, dec);
    if (p < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

let toastBox;
export function toast(message, type = "ok") {
  toastBox ??= document.body.appendChild(h("div", { class: "toasts", role: "status", "aria-live": "polite" }));
  const t = h("div", { class: `toast ${type}` }, icon(type === "error" ? "alert" : "check"), h("span", {}, message));
  toastBox.append(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, type === "error" ? 5000 : 2600);
}

/** Boîte de confirmation. Renvoie une promesse booléenne. */
export function confirmer(titre, texte, { ok = "Confirmer", danger = false } = {}) {
  return new Promise((resolve) => {
    const close = (v) => { back.remove(); document.removeEventListener("keydown", onKey); resolve(v); };
    const onKey = (e) => { if (e.key === "Escape") close(false); };
    const back = h("div", { class: "modal-back", onclick: (e) => e.target === back && close(false) },
      h("div", { class: "modal card", role: "dialog", "aria-modal": "true" },
        h("h3", {}, titre), h("p", {}, texte),
        h("div", { class: "actions" },
          h("button", { class: "btn", onclick: () => close(false) }, "Annuler"),
          h("button", { class: `btn ${danger ? "danger" : "primary"}`, onclick: () => close(true) }, ok))));
    document.body.append(back);
    document.addEventListener("keydown", onKey);
    back.querySelector(".btn.primary, .btn.danger").focus();
  });
}

/** Lit une valeur CSS (pour les couleurs des graphiques). */
export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Préférence locale (année choisie…) — jamais bloquant. */
export const pref = {
  get(k, def) { try { return JSON.parse(localStorage.getItem("eff." + k)) ?? def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem("eff." + k, JSON.stringify(v)); } catch { /* ignoré */ } },
};
