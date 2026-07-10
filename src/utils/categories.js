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

export function categoryType(category) {
  if (INCOME_CATEGORIES.includes(category)) return "income";
  if (EXPENSE_CATEGORIES.includes(category)) return "expense";
  return null;
}

export function categoriesForType(type) {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}
