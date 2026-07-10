import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { formatZAR, todayStr, toDateStr, formatDateDisplay } from "../utils/format";
import { categoriesForType, categoryType } from "../utils/categories";
import { getNextDueDate } from "../utils/recurring";

function ItemForm({ user, item, onClose }) {
  const initialType = item ? categoryType(item.category) || "expense" : "expense";
  const [type, setType] = useState(initialType);
  const [name, setName] = useState(item?.name || "");
  const [category, setCategory] = useState(item?.category || categoriesForType(initialType)[0]);
  const [amount, setAmount] = useState(item?.amount ?? "");
  const [frequency, setFrequency] = useState(item?.frequency || "monthly");
  const [startDate, setStartDate] = useState(item?.startDate || todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = categoriesForType(type);

  const handleTypeChange = (t) => {
    setType(t);
    setCategory(categoriesForType(t)[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!name.trim()) {
      setError("Enter a name");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        uid: user.uid,
        name: name.trim(),
        category,
        amount: amt,
        frequency,
        startDate,
        active: item?.active ?? true,
      };
      if (item) {
        await updateDoc(doc(db, "recurringItems", item.id), payload);
      } else {
        await addDoc(collection(db, "recurringItems"), payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-gray-900 border-t border-gray-800 rounded-t-xl p-4 pb-6 max-h-[88vh] overflow-y-auto"
      >
        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
        <h2 className="text-white text-lg font-semibold mb-4">{item ? "Edit" : "Add"} Recurring Item</h2>

        <div className="flex rounded-lg overflow-hidden border border-gray-800 mb-4">
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

        <label className="block text-xs text-white mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Adobe Creative Cloud"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-3 min-h-[44px] focus:outline-none focus:border-blue-500"
        />

        <label className="block text-xs text-white mb-1">Amount (ZAR)</label>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-3 min-h-[44px] focus:outline-none focus:border-blue-500"
        />

        <label className="block text-xs text-white mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-3 min-h-[44px] focus:outline-none focus:border-blue-500"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label className="block text-xs text-white mb-1">Frequency</label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-3 min-h-[44px] focus:outline-none focus:border-blue-500"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="annually">Annually</option>
        </select>

        <label className="block text-xs text-white mb-1">Start date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-3 min-h-[44px] focus:outline-none focus:border-blue-500"
        />

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
            className="flex-1 py-2.5 rounded-lg bg-blue-500 text-white font-medium min-h-[44px] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Recurring({ user }) {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "recurringItems"), where("uid", "==", user.uid));
    return onSnapshot(q, (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user?.uid]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = getNextDueDate(a);
      const dbb = getNextDueDate(b);
      if (!da && !dbb) return 0;
      if (!da) return 1;
      if (!dbb) return -1;
      return da - dbb;
    });
  }, [items]);

  const handleToggleActive = async (item) => {
    await updateDoc(doc(db, "recurringItems", item.id), { active: !item.active });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this recurring item?")) return;
    await deleteDoc(doc(db, "recurringItems", id));
  };

  return (
    <div className="p-4 pb-24 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-sm font-semibold">Recurring Items</h2>
        <button
          onClick={() => {
            setEditItem(null);
            setShowForm(true);
          }}
          className="text-xs px-3 py-1.5 rounded-lg bg-blue-500 text-white font-medium min-h-[36px]"
        >
          + Add
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-white text-sm text-center py-10">No recurring items yet.</div>
      ) : (
        sorted.map((item) => {
          const next = getNextDueDate(item);
          const type = categoryType(item.category) || "expense";
          return (
            <div
              key={item.id}
              className={`bg-gray-900 border border-gray-800 rounded-xl p-3 ${!item.active ? "opacity-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="min-w-0 cursor-pointer"
                  onClick={() => {
                    setEditItem(item);
                    setShowForm(true);
                  }}
                >
                  <div className="text-white text-sm font-medium truncate">{item.name}</div>
                  <div className="text-white text-xs">{item.category} · {item.frequency}</div>
                  <div className="text-white text-xs mt-0.5">
                    Next due: {next ? formatDateDisplay(toDateStr(next)) : "—"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-sm font-semibold ${type === "income" ? "text-green-500" : "text-red-400"}`}>
                    {type === "income" ? "+" : "-"}{formatZAR(item.amount)}
                  </span>
                  <button
                    onClick={() => handleToggleActive(item)}
                    className={`w-11 h-6 rounded-full transition relative ${item.active ? "bg-blue-500" : "bg-gray-700"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        item.active ? "translate-x-[22px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-2 pt-2 border-t border-gray-800">
                <button
                  onClick={() => {
                    setEditItem(item);
                    setShowForm(true);
                  }}
                  className="text-[11px] text-white hover:text-white"
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(item.id)} className="text-[11px] text-white hover:text-red-400">
                  Delete
                </button>
              </div>
            </div>
          );
        })
      )}

      {showForm && <ItemForm user={user} item={editItem} onClose={() => setShowForm(false)} />}
    </div>
  );
}
