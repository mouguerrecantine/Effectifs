// Grille de saisie façon tableur : enregistrement automatique, totaux en direct, navigation au clavier.
import { h, icon, fmt, toast } from "./ui.js";
import { weekday, dayMonth } from "./dates.js";

/**
 * cols : [{ k, l, group }] (champ saisi) ou [{ total: (valeurs) => n, l, group }] (colonne calculée)
 * rows : [{ date, values|null, tag?, muted? }]
 * onSave(date, valeurs) -> Promise ; onChange(lignes remplies)
 */
export function createGrid({ cols, rows, groups = {}, onSave, onChange = () => {} }) {
  const lines = rows.map((r) => ({ ...r, values: r.values ? { ...r.values } : null, timer: null, inputs: [], cells: [] }));
  const inputCols = cols.filter((c) => c.k);
  function read(line) {
    const vals = {};
    inputCols.forEach((c, j) => { vals[c.k] = Number(line.inputs[j].value) || 0; });
    return vals;
  }
  const filled = (vals) => vals && Object.values(vals).some((n) => n > 0);


  // Teinte pastel du groupe (colonnes saisies et colonnes calculées "douces") ; totaux = rouge.
  const tint = (c) => (c.total && !c.soft ? null : groups[c.group] || null);
  const cls = (c, j) => [c.total && !c.soft ? "total" : "", c.soft ? "calc" : "",
    j && cols[j - 1].group !== c.group ? "sep" : "", tint(c) ? "tinted" : ""].join(" ");
  const sty = (c) => (tint(c) ? { "--tint": tint(c) } : {});

  // En-têtes (groupes + libellés)
  const groupRow = h("tr", { class: "groups" }, h("th", {}));
  const labelRow = h("tr", {}, h("th", {}, "Date"));
  let i = 0;
  while (i < cols.length) {
    const g = cols[i].group;
    let span = 0;
    while (i + span < cols.length && cols[i + span].group === g) span++;
    groupRow.append(h("th", { colspan: span, style: { "--group-color": groups[g] || "var(--border)" } }, g ? h("span", {}, g) : ""));
    i += span;
  }
  cols.forEach((c, j) => labelRow.append(h("th", { class: cls(c, j), style: sty(c) }, c.l)));
  groupRow.append(h("th", {}));
  labelRow.append(h("th", { class: "status" }, h("span", { class: "sr-only" }, "État")));

  const tbody = h("tbody");
  const footCells = cols.map((c, j) => h("td", { class: cls(c, j), style: sty(c) }));
  const footJours = h("td", {});
  const tfoot = h("tfoot", {}, h("tr", {}, footJours, ...footCells, h("td", {})));

  lines.forEach((line, r) => {
    const status = h("span", { class: "st" });
    const tr = h("tr", { class: line.muted ? "muted" : "", style: { animationDelay: `${Math.min(r, 25) * 18}ms` } },
      h("td", { class: "date" }, h("span", { class: "wd" }, weekday(line.date)), dayMonth(line.date),
        line.tag ? h("span", { class: "tag" }, line.tag) : null));
    cols.forEach((c, j) => {
      if (c.k) {
        const v = line.values?.[c.k];
        const input = h("input", {
          class: "cell", inputmode: "numeric", autocomplete: "off", maxlength: 4,
          "aria-label": `${c.group ? c.group + " " : ""}${c.l} ${line.date}`, value: v ? String(v) : "",
          "data-r": r, "data-c": line.inputs.length,
        });
        input.addEventListener("input", () => onInput(line, input));
        input.addEventListener("keydown", (e) => onKey(e, r, Number(input.dataset.c)));
        input.addEventListener("focus", () => { tr.classList.add("focus"); input.select(); });
        input.addEventListener("blur", () => tr.classList.remove("focus"));
        line.inputs.push(input);
        tr.append(h("td", { class: cls(c, j), style: sty(c) }, input));
      } else {
        const td = h("td", { class: cls(c, j), style: sty(c) });
        line.cells.push({ c, td });
        tr.append(td);
      }
    });
    line.status = status;
    tr.append(h("td", { class: "status" }, status));
    line.tr = tr;
    tbody.append(tr);
    refreshRow(line, false);
  });

  const table = h("table", { class: "grid-table" }, h("thead", {}, groupRow, labelRow), tbody, tfoot);
  const el = h("div", { class: "table-wrap" }, table);
  refreshFoot();

  function refreshRow(line, flash = true) {
    for (const { c, td } of line.cells) {
      const n = filled(line.values) ? c.total(line.values) : null;
      const txt = n == null ? "" : fmt(n);
      if (td.textContent !== txt) {
        td.textContent = txt;
        if (flash) { td.classList.remove("flash"); void td.offsetWidth; td.classList.add("flash"); }
      }
    }
  }
  function refreshFoot() {
    const done = lines.filter((l) => filled(l.values));
    footJours.textContent = `Total · ${done.length} jour${done.length > 1 ? "s" : ""}`;
    cols.forEach((c, j) => {
      const s = done.reduce((a, l) => a + (c.k ? l.values[c.k] || 0 : c.total(l.values)), 0);
      footCells[j].textContent = fmt(s);
    });
    onChange(done.map((l) => ({ date: l.date, ...l.values })));
  }

  function onInput(line, input) {
    const clean = input.value.replace(/\D/g, "").slice(0, 4);
    if (clean !== input.value) input.value = clean;
    line.values = read(line);
    refreshRow(line);
    refreshFoot();
    setStatus(line, "pending");
    clearTimeout(line.timer);
    line.timer = setTimeout(() => save(line), 700);
  }

  async function save(line) {
    clearTimeout(line.timer);
    line.timer = null;
    setStatus(line, "saving");
    try {
      await onSave(line.date, line.values);
      setStatus(line, "saved");
    } catch (e) {
      console.error(e);
      setStatus(line, "error");
      toast("Échec de l'enregistrement du " + dayMonth(line.date) + ". Vérifiez la connexion.", "error");
    }
  }

  function setStatus(line, s) {
    line.state = s;
    line.status.className = `st ${s}`;
    line.status.replaceChildren(
      s === "saving" ? h("span", { class: "spinner" }) : s === "saved" ? icon("check") : s === "error" ? icon("alert") : "",
    );
    line.status.title = { saving: "Enregistrement…", saved: "Enregistré", error: "Erreur", pending: "" }[s] || "";
  }

  function onKey(e, r, c) {
    const move = (dr, dc) => {
      const target = lines[r + dr]?.inputs[c + dc];
      if (target) { e.preventDefault(); target.focus(); }
    };
    if (e.key === "Enter" || e.key === "ArrowDown") move(1, 0);
    else if (e.key === "ArrowUp") move(-1, 0);
    else if (e.key === "ArrowRight" && e.target.selectionStart === e.target.value.length) move(0, 1);
    else if (e.key === "ArrowLeft" && e.target.selectionStart === 0) move(0, -1);
  }

  /** Enregistre immédiatement ce qui est en attente (changement de page…). */
  const flush = () => Promise.all(lines.filter((l) => l.timer).map(save));
  const pending = () => lines.some((l) => l.timer || l.state === "saving");

  return { el, flush, pending };
}
