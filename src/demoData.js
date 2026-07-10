// Client-side only sample data for "View Demo" mode. Never touches Firestore.

export const demoUser = { uid: "demo-user", displayName: "Demo Preview", isDemo: true };

const today = new Date();
const d = (monthsOffset, day) => {
  const dt = new Date(today.getFullYear(), today.getMonth() + monthsOffset, day);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const rawTransactions = [
  { type: "income", category: "Retainer", description: "Acme Corp — Monthly Retainer", amount: 18000, date: d(-2, 1) },
  { type: "income", category: "Retainer", description: "Acme Corp — Monthly Retainer", amount: 18000, date: d(-1, 1) },
  { type: "income", category: "Retainer", description: "Acme Corp — Monthly Retainer", amount: 18000, date: d(0, 1) },
  { type: "income", category: "Project Fee", description: "Website Redesign — Nova Foods", amount: 32000, date: d(-2, 14) },
  { type: "income", category: "Project Fee", description: "Brand Refresh — Kaleo Skincare", amount: 24500, date: d(0, 8) },
  { type: "income", category: "Ad Hoc", description: "Logo tweak — Coastal Coffee Co", amount: 2800, date: d(-1, 20) },
  { type: "income", category: "Bonus", description: "Year-end bonus — Acme Corp", amount: 5000, date: d(-3, 15) },
  { type: "expense", category: "Software & Subscriptions", description: "Adobe Creative Cloud", amount: 899, date: d(-1, 3), recurring: true },
  { type: "expense", category: "Software & Subscriptions", description: "Adobe Creative Cloud", amount: 899, date: d(0, 3), recurring: true },
  { type: "expense", category: "Software & Subscriptions", description: "Notion Plus", amount: 180, date: d(0, 6) },
  { type: "expense", category: "Tax & Accounting", description: "Provisional tax payment", amount: 12400, date: d(-2, 25) },
  { type: "expense", category: "Tax & Accounting", description: "Bookkeeper — monthly retainer", amount: 1500, date: d(-1, 28), recurring: true },
  { type: "expense", category: "Travel", description: "Flights — Cape Town client visit", amount: 3200, date: d(-1, 12) },
  { type: "expense", category: "Travel", description: "Uber — client meetings", amount: 450, date: d(0, 9) },
  { type: "expense", category: "Office & Equipment", description: "New monitor", amount: 4999, date: d(-3, 18) },
  { type: "expense", category: "Marketing", description: "Google Ads campaign", amount: 2000, date: d(0, 4) },
  { type: "expense", category: "Salaries & Contractors", description: "Freelance designer — Sam K", amount: 8500, date: d(-1, 22) },
  { type: "expense", category: "Bank Charges", description: "Monthly account fee", amount: 150, date: d(-1, 1), recurring: true },
  { type: "expense", category: "Other Expense", description: "Office coffee & supplies", amount: 320, date: d(0, 11) },
];

export const demoTransactions = rawTransactions.map((t, i) => ({
  id: `demo-tx-${i}`,
  uid: demoUser.uid,
  recurring: false,
  ...t,
}));

const rawRecurringItems = [
  { name: "Acme Corp — Monthly Retainer", category: "Retainer", amount: 18000, frequency: "monthly", startDate: d(-3, 1) },
  { name: "Adobe Creative Cloud", category: "Software & Subscriptions", amount: 899, frequency: "monthly", startDate: d(-1, 3) },
  { name: "Web Hosting", category: "Software & Subscriptions", amount: 450, frequency: "monthly", startDate: d(-1, 25) },
  { name: "Bookkeeper — Monthly Retainer", category: "Tax & Accounting", amount: 1500, frequency: "monthly", startDate: d(-1, 28) },
  { name: "Business Insurance", category: "Other Expense", amount: 650, frequency: "annually", startDate: d(-3, 18) },
];

export const demoRecurringItems = rawRecurringItems.map((r, i) => ({
  id: `demo-rec-${i}`,
  uid: demoUser.uid,
  active: true,
  ...r,
}));

export const demoScenarios = [
  {
    id: "demo-scenario-0",
    uid: demoUser.uid,
    name: "Hire a Junior Designer",
    items: [
      { date: d(1, 1), description: "Junior Designer — Month 1", category: "Salaries & Contractors", amount: 12000, type: "expense" },
      { date: d(2, 1), description: "Junior Designer — Month 2", category: "Salaries & Contractors", amount: 12000, type: "expense" },
      { date: d(1, 15), description: "Extra capacity — New Client Project", category: "Project Fee", amount: 15000, type: "income" },
    ],
  },
];

export const DEMO_BLOCKED_MESSAGE = "This is a preview account — sign in with Google to save changes.";
