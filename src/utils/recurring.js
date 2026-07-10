import { parseDateStr, toDateStr } from "./format";
import { categoryType } from "./categories";

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addMonthsClamped(date, n) {
  const day = date.getDate();
  const d = new Date(date.getFullYear(), date.getMonth() + n, 1);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, daysInMonth));
  return d;
}

function addYearsClamped(date, n) {
  const day = date.getDate();
  const targetYear = date.getFullYear() + n;
  const daysInMonth = new Date(targetYear, date.getMonth() + 1, 0).getDate();
  return new Date(targetYear, date.getMonth(), Math.min(day, daysInMonth));
}

function stepDate(start, frequency, n) {
  if (n === 0) return start;
  if (frequency === "weekly") return addDays(start, 7 * n);
  if (frequency === "annually") return addYearsClamped(start, n);
  return addMonthsClamped(start, n);
}

// All occurrences of a recurring item within [rangeStart, rangeEnd], inclusive.
export function getOccurrencesInRange(item, rangeStart, rangeEnd) {
  const start = parseDateStr(item.startDate);
  if (!start || !item.active) return [];
  const results = [];
  let n = 0;
  let cursor = start;
  let guard = 0;
  while (cursor < rangeStart && guard < 5000) {
    n++;
    cursor = stepDate(start, item.frequency, n);
    guard++;
  }
  guard = 0;
  while (cursor <= rangeEnd && guard < 5000) {
    results.push(new Date(cursor));
    n++;
    cursor = stepDate(start, item.frequency, n);
    guard++;
  }
  return results;
}

export function getNextDueDate(item, from = new Date()) {
  if (!item.active) return null;
  const lookahead = new Date(from.getFullYear() + 5, from.getMonth(), from.getDate());
  const occ = getOccurrencesInRange(item, from, lookahead);
  return occ.length ? occ[0] : null;
}

function isOccurrencePaid(item, dateStr, transactions) {
  return transactions.some((t) => t.recurringItemId === item.id && t.date === dateStr);
}

// Occurrences within range that don't already have a matching logged transaction.
export function getUnpaidOccurrences(item, rangeStart, rangeEnd, transactions) {
  return getOccurrencesInRange(item, rangeStart, rangeEnd)
    .map((d) => toDateStr(d))
    .filter((dateStr) => !isOccurrencePaid(item, dateStr, transactions));
}

// Virtual (unpaid) transaction-shaped entries for every active recurring item in range.
export function projectUnpaidOccurrences(recurringItems, rangeStart, rangeEnd, transactions) {
  const out = [];
  for (const item of recurringItems) {
    if (!item.active) continue;
    const dates = getUnpaidOccurrences(item, rangeStart, rangeEnd, transactions);
    for (const dateStr of dates) {
      out.push({
        date: dateStr,
        amount: Math.abs(Number(item.amount) || 0),
        category: item.category,
        description: item.name,
        type: categoryType(item.category) || "expense",
        recurring: true,
        projected: true,
        recurringItemId: item.id,
      });
    }
  }
  return out;
}
