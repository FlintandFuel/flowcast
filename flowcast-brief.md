# FlowCast — Build Brief

Stack: React + Vite + Tailwind CSS v3 + Firebase Firestore + Google Auth + Anthropic API
Firebase project: fafc-os (same config as solo-os)
Deploy: Firebase Hosting (separate app from solo-os)

## Design
Dark mode. bg-gray-950 base, bg-gray-900 cards, border-gray-800, blue-500 accent, green-500 income, red-400 expense. Large prominent numbers. Mobile-first (390px), rounded-xl cards, 44px min touch targets. Header: "FlowCast". Login tagline: "Know your numbers. Own your future." All amounts in ZAR formatted as R 12,500.00. Bottom nav bar for 5 tabs.

## Firebase Collections
All docs include uid field.
- transactions: uid, date, description, category, amount, type(income|expense), recurring(bool), createdAt
- recurringItems: uid, name, category, amount, frequency(weekly|monthly|annually), startDate, active(bool)
- scenarios: uid, name, items[]
- userSettings: uid, settings{}

## File Structure
src/firebase.js — same fafc-os config
src/App.jsx — auth shell + bottom nav + tab router
src/tabs/Dashboard.jsx
src/tabs/Transactions.jsx
src/tabs/Recurring.jsx
src/tabs/WhatIf.jsx
src/tabs/Import.jsx
src/components/CashFlowChart.jsx
src/components/TransactionForm.jsx
src/components/HeroCard.jsx

Install: npm install recharts

## Tab 1: Dashboard
4 hero cards (use HeroCard.jsx):
1. Current Balance — sum all income minus expenses
2. Safe-to-Spend — balance minus upcoming committed expenses this calendar month
3. Runway — balance divided by 3-month avg expenses. Show as months or days if under 30. Green >3mo, yellow 1-3mo, red <1mo
4. Month-to-date — income vs expenses this month side by side

Below cards: 12-month bar chart (CashFlowChart.jsx). Blue bars above zero, red below. Past months use actual transactions, future months use recurring projections. Tap bar shows month breakdown.

Below chart: Upcoming this month — recurring items due in next 30 days, sorted by date.

## Tab 2: Transactions
List sorted by date desc. Each row: date, description, category, amount (green/red), recurring badge.
Filter bar: All / Income / Expenses / Category dropdown.
Floating + button → bottom sheet with TransactionForm.jsx.
CSV export button downloads filtered transactions.

TransactionForm fields: Type toggle (Income|Expense), Amount, Description, Category, Date (default today), Recurring toggle → if on show Frequency (Weekly/Monthly/Annually) + start date.

Income categories: Retainer, Project Fee, Ad Hoc, Bonus, Other Income
Expense categories: Software & Subscriptions, Tax & Accounting, Travel, Office & Equipment, Marketing, Salaries & Contractors, Bank Charges, Other Expense

## Tab 3: Recurring
Cards for each recurring item: name, category, amount, frequency, next due date, active/paused toggle.
Add/edit/delete/pause items here.
Recurring items feed 12-month projection but do NOT auto-create transactions.
When due, show reminder on Dashboard — user confirms payment which creates the transaction.

## Tab 4: What-If
Up to 5 named scenarios. Each has hypothetical transactions overlaid on real data.
Same 12-month chart with scenario items in amber.
Toggle: Base vs any saved scenario.
Summary per scenario: delta to runway, safe-to-spend, and end-of-year balance vs base.

## Tab 5: Import
Method A — CSV Upload:
Upload bank statement CSV. Auto-map columns (date, description, amount). Show preview table. User assigns category + income/expense per row. Column mapper for SA banks: Capitec, FNB, Standard Bank, Nedbank, Absa. Confirm imports to Firestore.

Method B — Screenshot Import:
Upload screenshot/photo of banking app. Send image to Claude API (claude-sonnet-4-6, vision). Prompt: extract all visible transactions as JSON array [{date, description, amount, type}]. Infer income/expense from positive/negative or context. Show same preview table as Method A. Loading state while processing. Handle errors if image unclear. API key from import.meta.env.VITE_ANTHROPIC_API_KEY.

Both methods: on confirm, create transaction docs in Firestore. Show success summary (X imported, total income Y, total expenses Z).

## Recurring Projections Logic
Generate virtually (not stored). For each active recurringItem project forward 12 months from today based on frequency. Merge with actual transactions for chart data.

## Auth
Google Auth via Firebase. onAuthStateChanged for session. Login screen: dark bg-gray-950, app name, tagline, Google sign-in button (same pattern as solo-os App.jsx).
