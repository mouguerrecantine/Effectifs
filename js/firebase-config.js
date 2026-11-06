// ⚠️ À REMPLIR (étape 3 du guide) : copier ici l'objet "firebaseConfig"
// donné par la console Firebase (Paramètres du projet > Vos applications > Config).
// Ces valeurs ne sont PAS secrètes : la sécurité est assurée par les règles Firestore.
export const firebaseConfig = {
  apiKey: "A_REMPLACER",
  authDomain: "A_REMPLACER.firebaseapp.com",
  projectId: "A_REMPLACER",
  storageBucket: "A_REMPLACER.appspot.com",
  messagingSenderId: "A_REMPLACER",
  appId: "A_REMPLACER",
};

export const configOk = !Object.values(firebaseConfig).some((v) => String(v).includes("A_REMPLACER"));
