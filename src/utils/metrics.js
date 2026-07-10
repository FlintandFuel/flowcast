import { toDateStr, parseDateStr } from "./format";
import { projectUnpaidOccurrences } from "./recurring";

export function computeBalance(transactions) {
  return transactions.reduce((sum, t) => {
    const amt = Number(t.amount) || 0;
    return sum + (t.type === "income" ? amt : -amt);
  }, 0);
}

function inMonth(dateStr, year, month) {
  const d = parseDateStr(dateStr);
  return d && d.getFullYear() === year && d.getMonth() === month;
}

export function computeMonthToDate(transactions, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthTx = transactions.filter((t) => inMonth(t.date, y, m));
  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  return { income, expense, net: income - expense };
}

export function computeSafeToSpend(transactions, recurringItems, balance, now = new Date()) {
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const upcoming = projectUnpaidOccurrences(recurringItems, now, endOfMonth, transactions)
    .filter((o) => o.type === "expense")
    .reduce((s, o) => s + o.amount, 0);
  return balance - upcoming;
}

export function computeRunway(transactions, balance, now = new Date()) {
  let total = 0;
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const monthExpense = transactions
      .filter((t) => t.type === "expense" && inMonth(t.date, y, m))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    total += monthExpense;
  }
  const avgMonthlyExpense = total / 3;
  if (avgMonthlyExpense <= 0) {
    return { months: Infinity, days: Infinity, level: "green", avgMonthlyExpense: 0 };
  }
  const months = balance / avgMonthlyExpense;
  const level = months > 3 ? "green" : months >= 1 ? "yellow" : "red";
  return { months, days: months * 30, level, avgMonthlyExpense };
}

export function computeEndOfYearBalance(transactions, recurringItems, balance, now = new Date()) {
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  if (now > endOfYear) return balance;
  const projected = projectUnpaidOccurrences(recurringItems, now, endOfYear, transactions);
  const net = projected.reduce((s, o) => s + (o.type === "income" ? o.amount : -o.amount), 0);
  return balance + net;
}

// 12-month window: 6 months back through 5 months forward (inclusive of current month).
// Each month = actual transactions + unpaid recurring occurrences dated in that month.
export function buildMonthlyChartData(transactions, recurringItems, now = new Date()) {
  const months = [];
  for (let i = -6; i <= 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  const rangeStart = new Date(months[0].year, months[0].month, 1);
  const rangeEndMonth = months[months.length - 1];
  const rangeEnd = new Date(rangeEndMonth.year, rangeEndMonth.month + 1, 0);
  const projected = projectUnpaidOccurrences(recurringItems, rangeStart, rangeEnd, transactions);

  return months.map(({ year, month }) => {
    const actualTx = transactions.filter((t) => inMonth(t.date, year, month));
    const projTx = projected.filter((t) => inMonth(t.date, year, month));
    const all = [...actualTx, ...projTx];
    const income = all.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense = all.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const isCurrent = year === now.getFullYear() && month === now.getMonth();
    const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());
    return {
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      year,
      month,
      income,
      expense,
      net: income - expense,
      projected: isFuture || isCurrent,
      items: all,
    };
  });
}

export function toRangeKey(dateStr) {
  const d = parseDateStr(dateStr);
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "";
}

export { toDateStr };
