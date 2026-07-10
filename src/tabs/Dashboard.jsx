import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import HeroCard from "../components/HeroCard.jsx";
import CashFlowChart from "../components/CashFlowChart.jsx";
import { formatZAR, formatDateShort, todayStr } from "../utils/format";
import { computeBalance, computeSafeToSpend, computeRunway, computeMonthToDate, buildMonthlyChartData } from "../utils/metrics";
import { projectUnpaidOccurrences } from "../utils/recurring";
import { categoryType } from "../utils/categories";

export default function Dashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [recurringItems, setRecurringItems] = useState([]);
  const [confirming, setConfirming] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "transactions"), where("uid", "==", user.uid));
    return onSnapshot(q, (snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "recurringItems"), where("uid", "==", user.uid));
    return onSnapshot(q, (snap) => setRecurringItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user?.uid]);

  const balance = useMemo(() => computeBalance(transactions), [transactions]);
  const safeToSpend = useMemo(() => computeSafeToSpend(transactions, recurringItems, balance), [transactions, recurringItems, balance]);
  const runway = useMemo(() => computeRunway(transactions, balance), [transactions, balance]);
  const mtd = useMemo(() => computeMonthToDate(transactions), [transactions]);
  const chartData = useMemo(() => buildMonthlyChartData(transactions, recurringItems), [transactions, recurringItems]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    return projectUnpaidOccurrences(recurringItems, now, in30, transactions).sort((a, b) => a.date.localeCompare(b.date));
  }, [recurringItems, transactions]);

  const runwayLabel = runway.months === Infinity
    ? "âˆž"
    : runway.days < 30
      ? `${Math.max(0, Math.round(runway.days))}d`
      : `${runway.months.toFixed(1)}mo`;

  const handleConfirm = async (occurrence) => {
    setConfirming(occurrence.recurringItemId + occurrence.date);
    try {
      await addDoc(collection(db, "transactions"), {
        uid: user.uid,
        date: occurrence.date,
        description: occurrence.description,
        category: occurrence.category,
        amount: occurrence.amount,
        type: occurrence.type || categoryType(occurrence.category) || "expense",
        recurring: true,
        recurringItemId: occurrence.recurringItemId,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <HeroCard label="Current Balance" value={formatZAR(balance)} tone={balance >= 0 ? "default" : "red"} />
        <HeroCard label="Safe-to-Spend" value={formatZAR(safeToSpend)} tone={safeToSpend >= 0 ? "blue" : "red"} />
        <HeroCard
          label="Runway"
          value={runwayLabel}
          tone={runway.level}
          sublabel={runway.months === Infinity ? "No recent expenses" : undefined}
        />
        <HeroCard label="Month-to-Date">
          <div className="flex items-baseline gap-2">
            <span className="text-green-500 text-lg font-bold">{formatZAR(mtd.income)}</span>
            <span className="text-white text-xs">/</span>
            <span className="text-red-400 text-lg font-bold">{formatZAR(mtd.expense)}</span>
          </div>
        </HeroCard>
      </div>

      <div>
        <h2 className="text-white text-sm font-semibold mb-2">12-Month Cash Flow</h2>
        <CashFlowChart data={chartData} />
      </div>

      <div>
        <h2 className="text-white text-sm font-semibold mb-2">Upcoming this month</h2>
        {upcoming.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-white text-sm text-center">
            Nothing due in the next 30 days.
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((o) => {
              const key = o.recurringItemId + o.date;
              const overdue = o.date < todayStr();
              return (
                <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white text-sm font-medium truncate">{o.description}</div>
                    <div className="text-white text-xs">
                      {o.category} Â· {formatDateShort(o.date)}
                      {overdue && <span className="text-red-400"> Â· overdue</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm font-semibold ${o.type === "income" ? "text-green-500" : "text-red-400"}`}>
                      {o.type === "income" ? "+" : "-"}{formatZAR(o.amount)}
                    </span>
                    <button
                      onClick={() => handleConfirm(o)}
                      disabled={confirming === key}
                      className="text-[10px] px-2 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/40 min-h-[36px] disabled:opacity-50"
                    >
                      {confirming === key ? "..." : "Confirm"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
