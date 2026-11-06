# Effectifs — plan de référence du projet (pour Claude)

Site web qui remplace le classeur Excel `Global_effectif.xlsm` de suivi des effectifs
(cantine scolaire + accueil de loisirs/CLSH). Hébergé sur GitHub Pages, données et connexion via Firebase.
Langue de l'interface et du code métier : **français**.
Nom affiché du site : **« Outils cuisine »** (menus, titre d'onglet, connexion). Le dépôt, l'adresse
(`/Effectifs/`), le projet Firebase, le format de sauvegarde `effectifs-v1` et les noms de fichiers exportés gardent « effectifs ».

## 1. Décisions validées avec l'utilisateur

| Sujet | Décision |
|---|---|
| Hébergement | GitHub Pages, dépôt **public** `mouguerrecantine/Effectifs`, branche `main`, racine `/` |
| Données / connexion | Firebase (Spark gratuit) : Firestore + Authentication e-mail/mot de passe |
| Utilisateurs | **Un seul compte**, créé à la main dans la console Firebase. Pas d'inscription depuis le site |
| Bilans | Par **année civile** (2025, 2026, 2027…) — plus d'années scolaires « 2025-2026 » |
| Colonne « Adultes » (repas écoles) | **Retirée** de l'interface (jamais utilisée). Champ `repasAdultes` encore écrit à 0 par `store.js` car exigé par les règles publiées. Les seuls « adultes » restants : pique-nique adultes (vacances) |
| Formules | Celles de l'Excel sont bonnes → reprises telles quelles, tout est **calculé automatiquement** (plus aucune valeur tapée à la main dans les bilans) |
| « Jour travaillé » | **Automatique** : un jour avec au moins une valeur > 0 = 1 jour travaillé. Rien à cocher |
| Écoles / groupes | **Fixes** (pas d'écran de paramétrage) — définis dans `js/metier.js` |
| Erreurs de l'Excel | Corrigées automatiquement par `outils/extraire_excel.py` |
| Bilan | Tableau de bord + comparaison N-1 + export Excel + impression PDF |
| Usage | **Ordinateur** (responsive correct mais non prioritaire) |
| Design | Sobre, moderne, jolies animations |

## 2. Stack technique

- **Aucune étape de build** : HTML + CSS + JavaScript (modules ES natifs). GitHub Pages sert les fichiers tels quels.
- Firebase JS SDK **v10.14.1** modulaire, importé depuis `https://www.gstatic.com/firebasejs/10.14.1/…`.
- Chart.js 4.4.1 et SheetJS 0.18.5 **copiés dans `js/vendor/`** (pas de CDN tiers ; SheetJS sert uniquement à *écrire* l'export, jamais à lire des fichiers).
- Police Inter (Google Fonts).

## 3. Arborescence

```
index.html               page unique (CSP stricte), charge js/app.js
manifest.webmanifest     nom « Outils cuisine » + icônes pour installer/raccourci (Chrome, Edge)
sw.js                    service worker « réseau d'abord » (toujours la dernière version, copie hors ligne)
version.json             numéro de version — ⚠️ À CHANGER À CHAQUE MISE EN LIGNE (déclenche la mise à jour auto)
assets/icons/            icônes PNG 192/512 (bords arrondis, fond transparent) + apple-touch, générées depuis assets/favicon.svg
css/style.css            design system (variables clair/sombre, animations, impression)
js/app.js                démarrage, auth, mise en page, routeur (#/page), sélecteur d'année
js/firebase-config.js    ⚠️ config Firebase à remplir (valeurs publiques, non secrètes)
js/firebase.js           initializeApp / getAuth / getFirestore
js/auth.js               login, logout, reset mot de passe, messages d'erreur FR
js/store.js              accès Firestore + cache par année, import/export JSON
js/metier.js             écoles, groupes, périodes, règles goûters (constantes fixes)
js/calcul.js             calculs des bilans (fonctions pures, testables sans Firebase)
js/dates.js              dates locales AAAA-MM-JJ, jours fériés français
js/grille.js             grille de saisie type tableur (autosave, totaux live, clavier)
js/ui.js                 h() (création DOM sûre), icônes SVG, toasts, countUp, confirm
js/maj.js                enregistre sw.js + vérifie version.json (5 min, focus) → recharge si nouvelle version
js/views/*.js            une page = un module exportant render(page, ctx)
firestore.rules          règles de sécurité à coller dans la console (UID à remplacer)
outils/extraire_excel.py conversion du .xlsm → donnees-initiales.json (importable)
```

Contrat d'une vue : `render(page, { year, data, store, auth, setSubtitle, reload })` → retourne `null`
ou `{ flush, pending, destroy }` (flush = enregistrer la saisie en attente avant de quitter la page).

## 4. Modèle de données Firestore

Un document **par jour**, identifiant = date `AAAA-MM-JJ` (pas de doublon possible). Jour vide ⇒ document supprimé.

| Collection | Champs (entiers ≥ 0) |
|---|---|
| `scolaire/{date}` | `repasPort, repasEliz, repasBourg, repasAdultes, gouterPort, gouterEliz, gouterBourg, gouterSteMarie` |
| `mercredis/{date}` | `poussins, jaguars, cobra, animateurs, personnel` |
| `vacances/{date}` | `periode` (`hiver/printemps/juillet/aout/toussaint`) + `poussins, jaguars, cobra, passerelle, piqueEnfants, piqueAdultes, animateurs, personnel` |
| `periodes/{annee}-{periode}` | `annee, periode, debut, fin` (dates d'ouverture d'une période de vacances) |

Tous les documents ont `date` (string) et `maj` (serverTimestamp). Chargement par année :
`where("date", ">=", "AAAA-01-01")` + `<= "AAAA-12-31"` (index simple, pas d'index composite).
Volume ≈ 450 docs/an → largement dans le quota gratuit.

## 5. Règles de calcul (reprises de l'Excel)

- Repas écoles / jour = Port + Eliz. + Bourg
- Goûters écoles / jour = Port + Eliz. + Bourg + Ste Marie
- Repas mercredi = Poussins + Jaguars + Cobra + Animateurs + Personnel
- **Goûters mercredi = Poussins + Jaguars + Cobra + Animateurs** (formule Excel `SUM(C:F)`)
- Repas vacances = somme des 8 colonnes (pique-niques inclus)
- **Goûters vacances = Poussins + Jaguars + Cobra + Passerelle**
- Jours travaillés = nombre de jours saisis (par activité)
- Total période scolaire = repas écoles + repas mercredis ; moyenne = total / (jours écoles + mercredis) *(formule du bilan 2026-2027)*
- Moyenne goûters / jour = goûters écoles / jours écoles
- Total général = écoles + mercredis + vacances (repas et goûters)
- Tableau de bord : comparaison avec N-1 **à date** pour l'année en cours (même période du 1/1 au jour J)

## 6. Interface

Barre latérale (Tableau de bord, Bilan annuel | Saisie : Repas & goûters, Mercredis, Vacances | Paramètres, Déconnexion)
+ barre haute (titre, sous-titre, sélecteur d'année ‹ 2026 ›, mémorisé dans localStorage).

1. **Connexion** — e-mail, mot de passe (afficher/masquer), « mot de passe oublié » (e-mail Firebase), fond animé.
2. **Tableau de bord** — 4 indicateurs animés (repas, goûters, jours travaillés, moyenne/jour) avec variation vs N-1,
   graphique empilé repas/mois (écoles, mercredis, vacances) + courbe N-1, repas par école, répartition, dernières saisies.
3. **Repas & goûters** — pastilles de mois, grille lun/mar/jeu/ven (fériés et vacances grisés), totaux live, indicateurs du mois.
4. **Mercredis** — idem, uniquement les mercredis.
5. **Vacances** — pastilles de période ; 1re fois : saisir début/fin → la grille des jours ouvrés se crée ; « Modifier les dates ».
6. **Bilan annuel** — onglets Repas / Goûters / Mercredis / Vacances (tableaux mois par mois ou par période + totaux),
   **Exporter Excel** (Synthèse + 4 feuilles), **Imprimer / PDF** (CSS d'impression : toutes les sections).
7. **Paramètres** — import JSON (données initiales ou sauvegarde, validé avant écriture), téléchargement d'une sauvegarde complète, compte.

Grille de saisie : Entrée/↓ ligne suivante, ↑, ←/→ entre colonnes ; enregistrement auto 0,7 s après la frappe ;
icône d'état par ligne (spinner → ✓, ou ⚠ + toast) ; enregistrement forcé en quittant la page.

## 7. Design

- Variables CSS dans `:root`, mode sombre automatique (`prefers-color-scheme`).
- Couleurs par activité : écoles `--c-scolaire` (indigo), mercredis `--c-mercredis` (bleu ciel),
  vacances `--c-vacances` (ambre), goûters `--c-gouters` (vert).
- Cartes arrondies 14 px, ombres douces, Inter, chiffres tabulaires.
- Animations : transition de page, cartes en cascade, compteurs animés, lignes de grille qui glissent,
  barres qui se remplissent, flash du total modifié, toasts, blobs animés à la connexion.
  Tout est coupé si `prefers-reduced-motion`.

## 8. Sécurité

- **Règles Firestore** (`firestore.rules`) : lecture/écriture uniquement si `request.auth.uid == UID du compte` ;
  validation stricte de chaque écriture (champs autorisés, entiers 0–5000, id = date, période valide) ; tout le reste refusé.
- Pas d'inscription dans le site ; désactiver aussi la création de compte dans Firebase si l'option est proposée.
- Domaines autorisés Firebase Auth : `mouguerrecantine.github.io` (+ `localhost` pour tests).
- CSP stricte dans `index.html` (scripts : self + gstatic uniquement), `noindex`, aucun `innerHTML` avec des données
  (fonction `h()` qui insère du texte ; `html:` réservé aux icônes constantes).
- **Aucune donnée dans le dépôt public** : `.gitignore` exclut `*.xlsm`, `*.xlsx`, `donnees*.json`, `sauvegarde*.json`.
- La config Firebase (apiKey…) est publique par nature ; option : restreindre la clé aux référents HTTP dans Google Cloud.
- Sauvegarde JSON téléchargeable depuis Paramètres (conseillé mensuellement).

## 9. Reprise des données Excel

`python3 outils/extraire_excel.py Global_effectif.xlsm donnees-initiales.json` puis Paramètres > Importer.
Résultat au 06/11/2026 : 247 jours écoles, 65 mercredis, 118 jours de vacances, 10 périodes (janv. 2025 → nov. 2026).
Vérifié : totaux mensuels repas/goûters et total mercredis **identiques à l'Excel**.

Corrections automatiques appliquées :
- Dates tapées sans mois/année (affichées 1900) : Janv-25 (16 jours), Mercredi-25 (8, 15, 22 janv.), Nov-25 (28 nov.).
- Mars-26 : 02/03/**2025** → 02/03/2026.
- Août 2026 saisi en texte (« 03 aout »…) → vraies dates ; la feuille était ignorée par l'Excel.
- Vac Tou-25 contenait 4 jours de la Toussaint **2026** (en double, valeurs légèrement différentes) → version de la feuille Toussaint 2026 gardée.
- Vac Jui-26 contenait les 3, 4 et 5 août (en double avec Août 2026) → retirés de juillet.
  ⇒ les totaux Toussaint 2025 et Juillet 2026 de l'Excel étaient gonflés par ces doublons.
- Goûters mercredis janv.–juil. 2026 tapés à la main dans l'Excel → désormais calculés.
- Colonne « jour travaillé » ignorée (calcul automatique).

## 9 bis. Mises à jour automatiques (site installé ou non)

- **À chaque commit qui change le site : modifier `version.json`** (format `AAAA-MM-JJ.n`, ex. `2026-11-06.2`).
- `js/maj.js` lit `version.json` (sans cache) au démarrage, toutes les 5 min et au retour sur la fenêtre ;
  si la version a changé : enregistre la saisie en attente (`flush`), toast « Nouvelle version… », recharge.
  Jamais pendant une saisie (curseur dans une case de grille ou un champ rempli) : réessai plus tard.
- `sw.js` : « réseau d'abord » avec `cache: "no-cache"` sur les fichiers du site (évite le cache de 10 min de
  GitHub Pages et les mélanges ancien/nouveau module) ; copie locale seulement si hors ligne ; autres domaines
  (Firebase, polices) non interceptés ; `version.json` jamais mis en cache.
- Nom/icône (manifeste) : Chrome/Edge les mettent à jour seuls sur les applis installées (vérif. au lancement).
- Tests Playwright : `serviceWorkers: 'block'` sinon `page.route` ne voit pas les requêtes servies par le SW.

## 10. Tests

Pas de framework. Test manuel/automatisé avec Playwright en remplaçant (via `page.route`) `js/firebase-config.js`,
`js/auth.js` et `js/store.js` par des maquettes en mémoire chargées depuis `donnees-initiales.json`.
`node --check` sur chaque module. `js/calcul.js` est pur et testable directement dans Node.

## 11. Pistes d'évolution (non demandées)

- Rappel des jours non saisis, saisie rapide « copier la veille ».
- App Check (reCAPTCHA) si besoin de durcir davantage.
- Multi-utilisateurs : remplacer `isOwner()` par une liste d'UID autorisés (collection `admins` ou custom claims).
