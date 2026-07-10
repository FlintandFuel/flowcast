export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

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
      pushField();
    } else if (c === "\r") {
      // ignore
    } else if (c === "\n") {
      pushRow();
    } else {
      field += c;
    }
  }
  if (field.length || row.length) pushRow();

  const filtered = rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
  const headers = filtered[0] || [];
  const dataRows = filtered.slice(1);
  return { headers, rows: dataRows };
}

export function parseFlexibleDate(s) {
  if (!s) return "";
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return "";
}

export function parseAmount(s) {
  if (s === null || s === undefined || s === "") return 0;
  let str = String(s).trim();
  const negParen = /^\((.*)\)$/.exec(str);
  if (negParen) str = "-" + negParen[1];
  const cleaned = str.replace(/[R\s,]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export const BANK_PRESETS = {
  generic: {
    label: "Generic / Other",
    date: ["date", "transaction date", "value date"],
    description: ["description", "narrative", "details", "reference"],
    amount: ["amount", "value"],
    debit: ["debit", "debit amount", "money out", "withdrawal"],
    credit: ["credit", "credit amount", "money in", "deposit"],
  },
  capitec: {
    label: "Capitec",
    date: ["transaction date", "date"],
    description: ["description"],
    amount: ["amount"],
    debit: ["debit amount"],
    credit: ["credit amount"],
  },
  fnb: {
    label: "FNB",
    date: ["date"],
    description: ["description"],
    amount: ["amount"],
    debit: ["debit"],
    credit: ["credit"],
  },
  standardbank: {
    label: "Standard Bank",
    date: ["date"],
    description: ["description"],
    amount: ["amount (zar)", "amount"],
    debit: ["debit"],
    credit: ["credit"],
  },
  nedbank: {
    label: "Nedbank",
    date: ["date"],
    description: ["description"],
    amount: ["amount"],
    debit: ["debit"],
    credit: ["credit"],
  },
  absa: {
    label: "Absa",
    date: ["date"],
    description: ["description"],
    amount: ["amount"],
    debit: ["debit"],
    credit: ["credit"],
  },
};

export function guessColumn(headers, keywords) {
  const lower = headers.map((h) => String(h).toLowerCase().trim());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h === kw);
    if (idx !== -1) return idx;
  }
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}
