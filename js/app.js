// Point d'entrée : connexion, mise en page, navigation (#/page), choix de l'année.
import { configOk } from "./firebase-config.js";
import { h, icon, pref, toast } from "./ui.js";

const root = document.getElementById("app");
const ANNEE_MIN = 2025;

const ROUTES = {
  "tableau-de-bord": { title: "Tableau de bord", icon: "dashboard", view: () => import("./views/tableau-de-bord.js") },
  bilan: { title: "Bilan annuel", icon: "bilan", view: () => import("./views/bilan.js") },
  repas: { title: "Repas & goûters", icon: "repas", color: "--c-scolaire", view: () => import("./views/saisie-repas.js") },
  mercredis: { title: "Mercredis", icon: "mercredi", color: "--c-mercredis", view: () => import("./views/saisie-mercredis.js") },
  vacances: { title: "Vacances", icon: "vacances", color: "--c-vacances", view: () => import("./views/saisie-vacances.js") },
  parametres: { title: "Paramètres", icon: "settings", view: () => import("./views/parametres.js") },
};

const state = { year: pref.get("year", new Date().getFullYear()), current: null, shell: null, renderId: 0 };
let auth, store;

function brand() {
  return h("div", { class: "brand" }, h("div", { class: "logo", html: icon("logo").innerHTML }), "Outils cuisine");
}

function renderSetup() {
  root.replaceChildren(h("div", { class: "setup card page" },
    brand(),
    h("h2", { style: { margin: "20px 0 8px" } }, "Configuration Firebase manquante"),
    h("p", { style: { color: "var(--muted)" } }, "Le site n'est pas encore relié à votre projet Firebase."),
    h("ol", {},
      h("li", {}, "Créez le projet Firebase (voir le guide, étapes 1 à 5)."),
      h("li", {}, "Copiez l'objet ", h("code", {}, "firebaseConfig"), " dans le fichier ", h("code", {}, "js/firebase-config.js"), "."),
      h("li", {}, "Enregistrez (commit) : le site se met à jour en 1 à 2 minutes."))));
}

async function boot() {
  if (!configOk) return renderSetup();
  try {
    [auth, store] = await Promise.all([import("./auth.js"), import("./store.js")]);
  } catch (e) {
    console.error(e);
    root.replaceChildren(h("div", { class: "setup card" }, h("h2", {}, "Impossible de charger Firebase"),
      h("p", {}, "Vérifiez votre connexion internet puis rechargez la page.")));
    return;
  }
  auth.onUser(async (user) => {
    if (user) {
      renderShell(user);
    } else {
      store.clearCache();
      state.shell = null;
      const { render } = await import("./views/connexion.js");
      render(root, { auth, brand });
    }
  });
}

function renderShell(user) {
  const nav = (key) => {
    const r = ROUTES[key];
    return h("a", { href: `#/${key}`, "data-route": key }, h("span", { html: icon(r.icon).innerHTML, style: { display: "inline-flex" } }), r.title,
      r.color ? h("span", { class: "dot", style: { background: `var(${r.color})` } }) : null);
  };
  const title = h("h1", {});
  const subtitle = h("div", { class: "subtitle" });
  const yearLabel = h("div", { class: "year" });
  const yearPicker = h("div", { class: "year-picker", role: "group", "aria-label": "Année" },
    h("button", { title: "Année précédente", "aria-label": "Année précédente", onclick: () => setYear(state.year - 1), html: icon("left").innerHTML }),
    yearLabel,
    h("button", { title: "Année suivante", "aria-label": "Année suivante", onclick: () => setYear(state.year + 1), html: icon("right").innerHTML }));
  const content = h("div", {});
  const sidebar = h("aside", { class: "sidebar" },
    brand(),
    h("nav", { class: "nav" },
      h("div", { class: "nav-title" }, "Vue d'ensemble"), nav("tableau-de-bord"), nav("bilan"),
      h("div", { class: "nav-title" }, "Saisie"), nav("repas"), nav("mercredis"), nav("vacances")),
    h("div", { class: "spacer" }),
    h("div", { class: "account nav" },
      h("div", { class: "email", title: user.email }, user.email),
      nav("parametres"),
      h("a", { href: "#", onclick: async (e) => { e.preventDefault(); if (await leave()) auth.logout(); } },
        h("span", { html: icon("logout").innerHTML, style: { display: "inline-flex" } }), "Déconnexion")));
  root.replaceChildren(h("div", { class: "shell" }, sidebar,
    h("main", { class: "main" },
      h("div", { class: "topbar" }, h("div", {}, title, subtitle), yearPicker),
      content)));
  state.shell = { title, subtitle, yearLabel, yearPicker, content, sidebar };
  navigate();
}

/** Termine proprement la page courante (enregistre la saisie en attente). */
async function leave() {
  const cur = state.current;
  if (!cur) return true;
  try { await cur.flush?.(); } catch { /* l'erreur est déjà signalée */ }
  cur.destroy?.();
  state.current = null;
  return true;
}

function setYear(y) {
  if (y < ANNEE_MIN || y > new Date().getFullYear() + 5) return;
  state.year = y;
  pref.set("year", y);
  navigate();
}

async function navigate() {
  if (!state.shell) return;
  const key = location.hash.replace(/^#\/?/, "").split("?")[0];
  if (!ROUTES[key]) { location.replace("#/tableau-de-bord"); return; }
  const id = ++state.renderId;
  await leave();
  const r = ROUTES[key];
  const s = state.shell;
  s.sidebar.querySelectorAll("a[data-route]").forEach((a) => a.classList.toggle("active", a.dataset.route === key));
  s.title.textContent = r.title;
  s.subtitle.textContent = "";
  s.yearLabel.replaceChildren(h("span", {}, state.year));
  s.yearPicker.style.visibility = key === "parametres" ? "hidden" : "visible";
  s.content.replaceChildren(h("div", { class: "splash", style: { position: "static", padding: "80px" } }, h("div", { class: "spinner" })));
  document.title = `${r.title} · Outils cuisine`;
  try {
    const [{ render }, data] = await Promise.all([r.view(), key === "parametres" ? null : store.loadYear(state.year)]);
    if (id !== state.renderId) return;
    const page = h("div", { class: "page" });
    s.content.replaceChildren(page);
    state.current = (await render(page, {
      year: state.year, data, store, auth,
      setSubtitle: (t) => { s.subtitle.textContent = t; },
      reload: () => navigate(),
    })) || null;
  } catch (e) {
    console.error(e);
    if (id !== state.renderId) return;
    const refus = e?.code === "permission-denied";
    s.content.replaceChildren(h("div", { class: "card empty page" },
      h("div", { class: "ico", html: icon("alert").innerHTML }),
      h("h3", {}, refus ? "Accès refusé par Firebase" : "Impossible de charger les données"),
      h("p", {}, refus ? "Vérifiez que l'UID dans les règles Firestore correspond à votre compte (étape 5 du guide)."
        : "Vérifiez votre connexion internet puis réessayez."),
      h("button", { class: "btn", onclick: () => navigate() }, "Réessayer")));
    if (!refus) toast("Erreur de chargement", "error");
  }
}

window.addEventListener("hashchange", navigate);
window.addEventListener("beforeunload", (e) => {
  if (state.current?.pending?.()) { state.current.flush?.(); e.preventDefault(); e.returnValue = ""; }
});

boot();
