// Page de connexion (aucune inscription : le compte unique est créé dans la console Firebase).
import { h, icon } from "../ui.js";

export function render(root, { auth, brand }) {
  const email = h("input", { class: "input", id: "email", type: "email", autocomplete: "username", required: true });
  const pw = h("input", { class: "input", id: "pw", type: "password", autocomplete: "current-password", required: true });
  const eye = h("button", { type: "button", "aria-label": "Afficher le mot de passe", html: icon("eye").innerHTML,
    onclick: () => { const show = pw.type === "password"; pw.type = show ? "text" : "password"; eye.innerHTML = icon(show ? "eyeOff" : "eye").innerHTML; } });
  const msg = h("div", {});
  const submit = h("button", { class: "btn primary lg", type: "submit" }, "Se connecter");

  const show = (cls, text) => msg.replaceChildren(text ? h("div", { class: cls, role: "alert" }, text) : "");

  const form = h("form", { novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    if (!email.value || !pw.value) return show("error", "Saisissez votre e-mail et votre mot de passe.");
    submit.disabled = true;
    submit.replaceChildren(h("span", { class: "spinner" }), "Connexion…");
    show();
    try {
      await auth.login(email.value, pw.value);
    } catch (err) {
      show("error", auth.messageErreur(err));
      submit.disabled = false;
      submit.replaceChildren("Se connecter");
      pw.select();
    }
  } },
  h("div", { class: "field" }, h("label", { for: "email" }, "E-mail"), email),
  h("div", { class: "field" }, h("label", { for: "pw" }, "Mot de passe"), h("div", { class: "pw-wrap" }, pw, eye)),
  msg, submit,
  h("button", { type: "button", class: "link", onclick: async () => {
    if (!email.value) return show("error", "Saisissez d'abord votre e-mail ci-dessus.");
    try { await auth.resetPassword(email.value); show("info", "Si ce compte existe, un e-mail de réinitialisation vient d'être envoyé."); }
    catch (err) { show("error", auth.messageErreur(err)); }
  } }, "Mot de passe oublié ?"));

  root.replaceChildren(h("div", { class: "login" },
    h("div", { class: "blob b1" }), h("div", { class: "blob b2" }), h("div", { class: "blob b3" }),
    h("div", { class: "login-card" },
      h("div", { class: "brand" }, brand()),
      h("h1", {}, "Bon retour 👋"),
      h("p", { class: "sub", style: { marginBottom: "22px" } }, "Connectez-vous pour gérer les effectifs."),
      form)));
  email.focus();
}
