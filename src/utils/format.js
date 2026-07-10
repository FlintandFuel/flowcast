export function formatZAR(amount) {
  const n = Number(amount) || 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}R ${abs.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayStr() {
  return toDateStr(new Date());
}

export function parseDateStr(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatDateDisplay(dateStr) {
  const d = parseDateStr(dateStr);
  if (!d) return "";
  return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateShort(dateStr) {
  const d = parseDateStr(dateStr);
  if (!d) return "";
  return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });
}

export function monthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString("en-ZA", { month: "short", year: "2-digit" });
}
