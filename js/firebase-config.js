// Configuration du projet Firebase "effectifs-c6627".
// Ces valeurs ne sont PAS secrètes : la sécurité est assurée par les règles Firestore.
export const firebaseConfig = {
  apiKey: "AIzaSyAdLktMn1YxjWTH12-niJSi-dUjbBVc_tE",
  authDomain: "effectifs-c6627.firebaseapp.com",
  projectId: "effectifs-c6627",
  storageBucket: "effectifs-c6627.firebasestorage.app",
  messagingSenderId: "386697440194",
  appId: "1:386697440194:web:3d9f83debf453af0eb045b",
};

export const configOk = !Object.values(firebaseConfig).some((v) => String(v).includes("A_REMPLACER"));
