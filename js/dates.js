// Outils de dates (tout en dates locales "AAAA-MM-JJ", sans fuseau horaire).

export const pad = (n) => String(n).padStart(2, "0");
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const today = () => iso(new Date());

const fmtWd = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const fmtDm = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });
const fmtLong = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const fmtShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
export const weekday = (s) => fmtWd.format(parse(s)).replace(".", "");
export const dayMonth = (s) => fmtDm.format(parse(s));
export const long = (s) => fmtLong.format(parse(s));
export const short = (s) => fmtShort.format(parse(s));

/** Jours du mois dont le jour de semaine est dans `wds` (0 = dimanche). */
export function daysOfMonth(year, month0, wds) {
  const out = [];
  for (let d = new Date(year, month0, 1); d.getMonth() === month0; d.setDate(d.getDate() + 1)) {
    if (wds.includes(d.getDay())) out.push(iso(d));
  }
  return out;
}

/** Jours ouvrés (lun–ven) entre deux dates incluses. */
export function weekdaysBetween(a, b) {
  const out = [];
  for (let d = parse(a), end = parse(b); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() >= 1 && d.getDay() <= 5) out.push(iso(d));
  }
  return out;
}

// Jours fériés français
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
const cacheFeries = new Map();
export function feries(y) {
  if (cacheFeries.has(y)) return cacheFeries.get(y);
  const map = new Map([
    [`${y}-01-01`, "Jour de l'an"], [`${y}-05-01`, "Fête du travail"], [`${y}-05-08`, "Victoire 1945"],
    [`${y}-07-14`, "Fête nationale"], [`${y}-08-15`, "Assomption"], [`${y}-11-01`, "Toussaint"],
    [`${y}-11-11`, "Armistice"], [`${y}-12-25`, "Noël"],
  ]);
  const p = easter(y);
  const plus = (n, label) => { const d = new Date(p); d.setDate(d.getDate() + n); map.set(iso(d), label); };
  plus(1, "Lundi de Pâques"); plus(39, "Ascension"); plus(50, "Lundi de Pentecôte");
  cacheFeries.set(y, map);
  return map;
}
export const ferie = (s) => feries(Number(s.slice(0, 4))).get(s) || null;
