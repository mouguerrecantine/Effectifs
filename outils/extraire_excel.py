"""Extrait les données du classeur Excel historique (Global_effectif.xlsm)
vers un fichier JSON importable dans le site (Paramètres > Importer).

Usage : python3 outils/extraire_excel.py Global_effectif.xlsm donnees-initiales.json

Corrections automatiques :
  - dates saisies sans mois/année (affichées en 1900) -> mois/année de la feuille
  - année erronée (ex. Toussaint 2025 saisie en 2026) -> année de la feuille
  - dates en texte ("03 aout") -> vraie date
  - jours entièrement vides ou à zéro -> ignorés (non travaillés)
"""
import datetime as dt
import json
import re
import sys

import openpyxl

MOIS = {"janv": 1, "fev": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6, "juillet": 7, "jui": 7,
        "aout": 8, "sept": 9, "sep": 9, "oct": 10, "nov": 11, "dec": 12}
PERIODES = {"Hiv": "hiver", "Prin": "printemps", "Jui": "juillet", "Aout": "aout", "Tou": "toussaint"}
PERIODE_MOIS = {"hiver": 2, "printemps": 4, "juillet": 7, "aout": 8, "toussaint": 10}
MOIS_PERIODE = {1: "hiver", 2: "hiver", 3: "hiver", 4: "printemps", 5: "printemps", 6: "juillet", 7: "juillet",
                8: "aout", 9: "toussaint", 10: "toussaint", 11: "toussaint", 12: "toussaint"}

corrections = []


def num(v):
    if v is None or v == "":
        return 0
    if isinstance(v, (int, float)):
        return int(round(v))
    try:
        return int(float(str(v).replace(",", ".")))
    except ValueError:
        return 0


def fix_date(raw, year, month, sheet, cell, month_tolerance=1):
    """Retourne une date ISO corrigée, ou None si la cellule n'est pas une date."""
    if isinstance(raw, str):
        m = re.match(r"\s*(\d{1,2})\s*([a-zéû]+)", raw.lower())
        if not m:
            return None
        key = m.group(2).replace("é", "e").replace("û", "u")
        mo = next((v for k, v in MOIS.items() if key.startswith(k)), month)
        d = dt.date(year, mo, int(m.group(1)))
        corrections.append(f"{sheet}!{cell} : texte '{raw}' -> {d.isoformat()}")
        return d.isoformat()
    if not isinstance(raw, dt.datetime):
        return None
    d = raw.date()
    if d.year == 1900:
        new = dt.date(year, month, d.day)
        corrections.append(f"{sheet}!{cell} : date incomplète ({d.day}) -> {new.isoformat()}")
        return new.isoformat()
    if d.year != year and abs(d.month - month) <= month_tolerance:
        new = dt.date(year, d.month, d.day)
        corrections.append(f"{sheet}!{cell} : année {d.year} -> {new.isoformat()}")
        return new.isoformat()
    return d.isoformat()


def add(store, kind, iso, data, sheet, prio=1):
    """prio=1 : la date appartient bien à la feuille ; prio=0 : ligne mal rangée."""
    if not any(v for k, v in data.items() if k not in ("date", "periode")):
        return
    prev = store[kind].get(iso)
    if prev:
        if prev["_prio"] > prio:
            corrections.append(f"{sheet} : {iso} en double, ligne mal rangée ignorée (version de '{prev['_sheet']}' gardée)")
            return
        corrections.append(f"{sheet} : {iso} en double avec '{prev['_sheet']}', version de '{sheet}' gardée")
    store[kind][iso] = {"date": iso, **data, "_prio": prio, "_sheet": sheet}


def main(src, dst):
    wb = openpyxl.load_workbook(src, data_only=True)
    store = {"scolaire": {}, "mercredis": {}, "vacances": {}}

    for ws in wb.worksheets:
        name = ws.title
        # Feuilles mensuelles repas/goûters : "Oct-26", "Janv-27"…
        m = re.fullmatch(r"(Janv|Fev|Mars|Avril|Mai|Juin|Juillet|Sept|Oct|Nov|Dec)-(\d\d)", name)
        if m:
            month, year = MOIS[m.group(1).lower()], 2000 + int(m.group(2))
            has_adultes = ws["F5"].value == "ADULTES"
            for r in range(6, 24):
                iso = fix_date(ws.cell(r, 2).value, year, month, name, f"B{r}", 0)
                if not iso:
                    continue
                c = lambda col: num(ws.cell(r, col).value)
                g0 = 9 if has_adultes else 8
                add(store, "scolaire", iso, {
                    "repasPort": c(3), "repasEliz": c(4), "repasBourg": c(5),
                    "repasAdultes": c(6) if has_adultes else 0,
                    "gouterPort": c(g0), "gouterEliz": c(g0 + 1), "gouterBourg": c(g0 + 2), "gouterSteMarie": c(g0 + 3),
                }, name)
            continue
        # Vacances : "Vac Hiv-26"
        m = re.fullmatch(r"Vac (Hiv|Prin|Jui|Aout|Tou)-(\d\d)", name)
        if m:
            periode, year = PERIODES[m.group(1)], 2000 + int(m.group(2))
            for r in range(7, 36):
                raw = ws.cell(r, 2).value
                if hasattr(raw, "year") and raw.year != 1900:
                    iso = raw.date().isoformat()  # vraie date : gardée telle quelle
                else:
                    iso = fix_date(raw, year, PERIODE_MOIS[periode], name, f"B{r}")
                if not iso:
                    continue
                p = MOIS_PERIODE[int(iso[5:7])]
                prio = 1 if (int(iso[:4]) == year and p == periode) else 0
                c = lambda col: num(ws.cell(r, col).value)
                add(store, "vacances", iso, {
                    "periode": p, "poussins": c(3), "jaguars": c(4), "cobra": c(5), "passerelle": c(6),
                    "piqueEnfants": c(7), "piqueAdultes": c(8), "animateurs": c(9), "personnel": c(10),
                }, name, prio)
            continue
        # Mercredis : "Mercredi-25", "Mercredi-26", "Mer-Oct-26"…
        m = re.fullmatch(r"Mercredi-(\d\d)|Mer-(\w+)-(\d\d)", name)
        if m and name != "Mer-26-27-M":
            for r in range(7, 56):
                raw = ws.cell(r, 2).value
                if m.group(1):
                    year = 2000 + int(m.group(1))
                    month = raw.month if isinstance(raw, dt.datetime) else 1
                    tol = 0
                else:
                    year, month, tol = 2000 + int(m.group(3)), MOIS[m.group(2).lower()], 0
                if isinstance(raw, dt.datetime) and raw.year not in (1900,) and m.group(1):
                    iso = raw.date().isoformat()  # feuilles annuelles : dates à cheval sur 2 années, gardées telles quelles
                else:
                    iso = fix_date(raw, year, month, name, f"B{r}", tol)
                if not iso:
                    continue
                c = lambda col: num(ws.cell(r, col).value)
                add(store, "mercredis", iso, {
                    "poussins": c(3), "jaguars": c(4), "cobra": c(5), "animateurs": c(6), "personnel": c(7),
                }, name)

    for kind in store.values():
        for d in kind.values():
            d.pop("_prio"), d.pop("_sheet")

    # Périodes de vacances (début/fin) déduites des jours saisis
    periodes = {}
    for d in store["vacances"].values():
        key = f"{d['date'][:4]}-{d['periode']}"
        p = periodes.setdefault(key, {"id": key, "annee": int(d["date"][:4]), "periode": d["periode"],
                                      "debut": d["date"], "fin": d["date"]})
        p["debut"], p["fin"] = min(p["debut"], d["date"]), max(p["fin"], d["date"])

    out = {
        "format": "effectifs-v1",
        "genere": dt.datetime.now().isoformat(timespec="seconds"),
        "scolaire": sorted(store["scolaire"].values(), key=lambda d: d["date"]),
        "mercredis": sorted(store["mercredis"].values(), key=lambda d: d["date"]),
        "vacances": sorted(store["vacances"].values(), key=lambda d: d["date"]),
        "periodes": sorted(periodes.values(), key=lambda p: p["debut"]),
    }
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"scolaire={len(out['scolaire'])} mercredis={len(out['mercredis'])} "
          f"vacances={len(out['vacances'])} periodes={len(out['periodes'])}")
    print("Corrections :")
    for c in corrections:
        print("  -", c)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
