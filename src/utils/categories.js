export const INCOME_CATEGORIES = [
  "Retainer",
  "Project Fee",
  "Ad Hoc",
  "Bonus",
  "Other Income",
];

export const EXPENSE_CATEGORIES = [
  "Software & Subscriptions",
  "Tax & Accounting",
  "Travel",
  "Office & Equipment",
  "Marketing",
  "Salaries & Contractors",
  "Bank Charges",
  "Other Expense",
];

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

// Fixed-order categorical palette (dark-surface validated). Same category
// always gets the same color everywhere it appears in the app.
export const CATEGORY_COLORS = {
  "Software & Subscriptions": "#3987e5",
  "Tax & Accounting": "#199e70",
  "Travel": "#c98500",
  "Office & Equipment": "#008300",
  "Marketing": "#9085e9",
  "Salaries & Contractors": "#e66767",
  "Bank Charges": "#d55181",
  "Other Expense": "#d95926",
  "Retainer": "#3987e5",
  "Project Fee": "#199e70",
  "Ad Hoc": "#c98500",
  "Bonus": "#9085e9",
  "Other Income": "#d95926",
};

export function categoryColor(category) {
  return CATEGORY_COLORS[category] || "#3987e5";
}

export function categoryType(category) {
  if (INCOME_CATEGORIES.includes(category)) return "income";
  if (EXPENSE_CATEGORIES.includes(category)) return "expense";
  return null;
}

export function categoriesForType(type) {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}
