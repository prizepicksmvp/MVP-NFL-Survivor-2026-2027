/**
 * Shared logic: loading pick data (from a published Google Sheet CSV, or
 * the sample fallback), parsing it, and aggregating it into % breakdowns.
 * Loaded before index.js / history.js on every page.
 */
window.Survivor = (function () {
  const cfg = window.SURVIVOR_CONFIG || {};
  const rawBaseUrl = window.SURVIVOR_BASE_URL || "/";
  const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl : `${rawBaseUrl}/`;

  function fromBase(path) {
    return `${baseUrl}${path.replace(/^\/+/, "")}`;
  }

  async function loadData() {
    if (cfg.SHEET_CSV_URL && cfg.SHEET_CSV_URL.trim()) {
      const res = await fetch(cfg.SHEET_CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Sheet fetch failed: " + res.status);
      const csv = await res.text();
      return rowsToWeeks(parseCSV(csv));
    }
    const res = await fetch(fromBase("data/sample-weeks.json"), { cache: "no-store" });
    if (!res.ok) throw new Error("Sample data fetch failed");
    return res.json();
  }

  // Minimal CSV parser that handles quoted fields containing commas.
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }

    if (!rows.length) return [];
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    return rows.slice(1)
      .filter((r) => r.some((cell) => cell.trim() !== ""))
      .map((r) => {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = (r[idx] || "").trim(); });
        return obj;
      });
  }

  // Turns flat sheet rows into the { week, entries: [...] } shape the renderers expect.
  function rowsToWeeks(rows) {
    const byWeek = new Map();
    rows.forEach((r) => {
      const week = parseInt(r["week"], 10);
      if (!week || !r["qb pick"]) return;
      if (!byWeek.has(week)) byWeek.set(week, []);
      byWeek.get(week).push({
        name: r["name"] || "",
        qb: r["qb pick"],
        result: normalizeResult(r["result"]),
      });
    });
    return Array.from(byWeek.entries())
      .map(([week, entries]) => ({ week, entries }))
      .sort((a, b) => a.week - b.week);
  }

  function normalizeResult(raw) {
    const v = (raw || "").trim().toLowerCase();
    if (v.startsWith("surv") || v === "yes" || v === "y") return "Survived";
    if (v.startsWith("elim") || v === "no" || v === "n") return "Eliminated";
    return "Pending";
  }

  function aggregatePicks(entries) {
    const counts = new Map(); // key: qb -> { qb, count, results }
    entries.forEach((e) => {
      const key = e.qb.toLowerCase();
      if (!counts.has(key)) {
        counts.set(key, { qb: e.qb, count: 0, results: { Survived: 0, Eliminated: 0, Pending: 0 } });
      }
      const c = counts.get(key);
      c.count += 1;
      c.results[e.result] = (c.results[e.result] || 0) + 1;
    });
    const total = entries.length;
    return Array.from(counts.values())
      .map((c) => ({ ...c, pct: total ? (c.count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
  }

  function dominantResult(c) {
    const { Survived, Eliminated, Pending } = c.results;
    if (Pending >= Survived && Pending >= Eliminated) return "Pending";
    return Survived >= Eliminated ? "Survived" : "Eliminated";
  }

  // Every QB a given name has already been credited with picking, across all
  // recorded weeks — used to enforce "once picked, never again."
  function usedQBsForName(weeksData, name) {
    const target = name.trim().toLowerCase();
    if (!target) return [];
    const used = new Map(); // qb -> { qb, week }
    weeksData.forEach((w) => {
      w.entries.forEach((e) => {
        if ((e.name || "").trim().toLowerCase() === target) {
          const key = e.qb.toLowerCase();
          if (!used.has(key)) used.set(key, { qb: e.qb, week: w.week });
        }
      });
    });
    return Array.from(used.values()).sort((a, b) => a.week - b.week);
  }

  // Total eliminations recorded across every week so far — used to derive
  // "MVPs still alive" from a configured season roster size without ever
  // needing to know who any of them are.
  function cumulativeEliminated(weeksData) {
    return weeksData.reduce((sum, w) => sum + w.entries.filter((e) => e.result === "Eliminated").length, 0);
  }

  // Picks the week to show as "current." Honors a manual CURRENT_WEEK
  // override in config so grading results or adding next week's rows
  // never flips the site on its own — falls back to the highest week
  // number present in the data if no override is set (or it doesn't
  // match anything yet).
  function resolveCurrentWeek(weeksData) {
    if (cfg.CURRENT_WEEK != null) {
      const match = weeksData.find((w) => w.week === Number(cfg.CURRENT_WEEK));
      if (match) return match;
    }
    return weeksData[weeksData.length - 1];
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return { cfg, loadData, parseCSV, rowsToWeeks, normalizeResult, aggregatePicks, dominantResult, usedQBsForName, cumulativeEliminated, resolveCurrentWeek, escapeHTML };
})();
// Point every "Make Your Pick" nav button to this week's Typeform link
document.querySelectorAll('[data-pick-link]').forEach(function (el) {
  const typeformUrl = (window.SURVIVOR_CONFIG || {}).TYPEFORM_URL;
  if (typeformUrl) el.href = typeformUrl;
});
