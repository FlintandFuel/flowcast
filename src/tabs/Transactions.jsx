import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import TransactionForm from "../components/TransactionForm.jsx";
import { formatZAR, formatDateDisplay } from "../utils/format";
import { ALL_CATEGORIES, categoryColor } from "../utils/categories";

export default function Transactions({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "transactions"), where("uid", "==", user.uid));
    return onSnapshot(q, (snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user?.uid]);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => filterType === "all" || t.type === filterType)
      .filter((t) => filterCategory === "all" || t.category === filterCategory)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [transactions, filterType, filterCategory]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    await deleteDoc(doc(db, "transactions", id));
  };

  const handleExport = () => {
    const headers = ["Date", "Description", "Category", "Type", "Amount", "Recurring"];
    const rows = filtered.map((t) => [t.date, t.description, t.category, t.type, t.amount, t.recurring ? "Yes" : "No"]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowcast-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className="p-4 pb-2 space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto">
            {["all", "income", "expense"].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap min-h-[32px] ${
                  filterType === f ? "bg-blue-500 text-white" : "bg-gray-900 text-white border border-white/[0.08]"
                }`}
              >
                {f === "all" ? "All" : f === "income" ? "Income" : "Expenses"}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            className="text-[10px] text-white hover:text-white px-2 py-1.5 rounded-lg border border-gray-700 whitespace-nowrap"
          >
            Export CSV
          </button>
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full bg-gray-900 border border-white/[0.08] rounded-lg px-3 py-2 text-white text-xs min-h-[36px]"
        >
          <option value="all">All Categories</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-white text-sm text-center py-10">No transactions found.</div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="bg-gray-900 border border-white/[0.08] rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white text-sm font-medium truncate flex items-center gap-2">
                  {t.description}
                  {t.recurring && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/40 flex-shrink-0">
                      Recurring
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-white/50 text-xs mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor(t.category) }} />
                  {formatDateDisplay(t.date)} · {t.category}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-sm font-semibold ${t.type === "income" ? "text-green-500" : "text-red-400"}`}>
                  {t.type === "income" ? "+" : "-"}{formatZAR(t.amount)}
                </span>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-white hover:text-red-400 text-xs w-7 h-7 flex items-center justify-center flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setShowForm(true)}
        className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-2xl flex items-center justify-center shadow-lg shadow-blue-500/30"
      >
        +
      </button>

      {showForm && <TransactionForm user={user} onClose={() => setShowForm(false)} />}
    </div>
  );
}
