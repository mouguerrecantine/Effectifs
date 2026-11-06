// Connexion (un seul compte, créé à la main dans la console Firebase — aucune inscription possible depuis le site).
import { auth } from "./firebase.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

export const onUser = (cb) => onAuthStateChanged(auth, cb);
export const login = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password);
export const logout = () => signOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());
export const currentEmail = () => auth.currentUser?.email || "";

const MESSAGES = {
  "auth/invalid-credential": "E-mail ou mot de passe incorrect.",
  "auth/invalid-email": "Adresse e-mail invalide.",
  "auth/user-disabled": "Ce compte est désactivé.",
  "auth/user-not-found": "E-mail ou mot de passe incorrect.",
  "auth/wrong-password": "E-mail ou mot de passe incorrect.",
  "auth/too-many-requests": "Trop de tentatives. Réessayez dans quelques minutes.",
  "auth/network-request-failed": "Pas de connexion internet.",
  "auth/missing-email": "Saisissez votre e-mail.",
  "auth/unauthorized-domain": "Ce domaine n'est pas autorisé dans Firebase (voir étape 6 du guide).",
};
export const messageErreur = (e) => MESSAGES[e?.code] || "Une erreur est survenue. Réessayez.";
