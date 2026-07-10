import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { categoriesForType } from "../utils/categories";
import { todayStr } from "../utils/format";
import { DEMO_BLOCKED_MESSAGE } from "../demoData.js";

export default function TransactionForm({ user, onClose, onSaved }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categoriesForType("expense")[0]);
  const [date, setDate] = useState(todayStr());
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = categoriesForType(type);

  const handleTypeChange = (t) => {
    setType(t);
    setCategory(categoriesForType(t)[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user.isDemo) {
      alert(DEMO_BLOCKED_MESSAGE);
      onClose();
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!description.trim()) {
      setError("Enter a description");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addDoc(collection(db, "transactions"), {
        uid: user.uid,
        date,
        description: description.trim(),
        category,
        amount: amt,
        type,
        recurring,
        createdAt: serverTimestamp(),
      });

      if (recurring) {
        await addDoc(collection(db, "recurringItems"), {
          uid: user.uid,
          name: description.trim(),
          category,
          amount: amt,
          frequency,
          startDate,
          active: true,
        });
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save transaction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-gray-900 border-t border-white/[0.08] rounded-t-xl p-4 pb-6 max-h-[88vh] overflow-y-auto"
      >
        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
        <h2 className="text-white text-lg font-semibold mb-4">Add Transaction</h2>

        <div className="flex rounded-lg overflow-hidden border border-white/[0.08] mb-4">
          <button
            type="button"
            onClick={() => handleTypeChange("income")}
            className={`flex-1 py-2.5 text-sm font-medium min-h-[44px] transition ${
              type === "income" ? "bg-green-500/20 text-green-500" : "text-white"
            }`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("expense")}
            className={`flex-1 py-2.5 text-sm font-medium min-h-[44px] transition ${
              type === "expense" ? "bg-red-400/20 text-red-400" : "text-white"
            }`}
          >
            Expense
          </button>
        </div>

        <label className="block text-xs text-white/50 mb-1">Amount (ZAR)</label>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-3 min-h-[44px] focus:outline-none focus:border-blue-500"
        />

        <label className="block text-xs text-white/50 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Client retainer"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-3 min-h-[44px] focus:outline-none focus:border-blue-500"
        />

        <label className="block text-xs text-white/50 mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-3 min-h-[44px] focus:outline-none focus:border-blue-500"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label className="block text-xs text-white/50 mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-3 min-h-[44px] focus:outline-none focus:border-blue-500"
        />

        <div className="flex items-center justify-between py-2 mb-1">
          <span className="text-sm text-white">Recurring</span>
          <button
            type="button"
            onClick={() => setRecurring((r) => !r)}
            className={`inline-flex items-center h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
              recurring ? "bg-blue-500" : "bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                recurring ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {recurring && (
          <div className="mb-3 space-y-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white min-h-[44px] focus:outline-none focus:border-blue-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white min-h-[44px] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {error && <div className="text-red-400 text-xs mb-3">{error}</div>}

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-700 text-white min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-md shadow-blue-500/20 min-h-[44px] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
