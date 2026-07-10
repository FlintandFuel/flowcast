import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import CashFlowChart from "../components/CashFlowChart.jsx";
import { formatZAR, todayStr } from "../utils/format";
import { categoriesForType } from "../utils/categories";
import {
  computeBalance,
  computeSafeToSpend,
  computeRunway,
  computeEndOfYearBalance,
  buildMonthlyChartData,
} from "../utils/metrics";

const MAX_SCENARIOS = 5;

function ScenarioItemForm({ onAdd, onClose }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categoriesForType("expense")[0]);
  const [date, setDate] = useState(todayStr());

  const categories = categoriesForType(type);

  const handleTypeChange = (t) => {
    setType(t);
    setCategory(categoriesForType(t)[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !description.trim()) return;
    onAdd({ date, description: description.trim(), category, amount: amt, type });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-gray-900 border-t border-gray-800 rounded-t-xl p-4 pb-6 max-h-[88vh] overflow-y-auto"
      >
        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
        <h2 className="text-white text-lg font-semibold mb-4">Add Hypothetical Item</h2>

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

        <label className="block text-xs text-white mb-1">Amount (ZAR)</label>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-3 min-h-[44px] focus:outline-none focus:border-amber-500"
        />

        <label className="block text-xs text-white mb-1">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. New client retainer"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-3 min-h-[44px] focus:outline-none focus:border-amber-500"
        />

        <label className="block text-xs text-white mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-3 min-h-[44px] focus:outline-none focus:border-amber-500"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label className="block text-xs text-white mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-4 min-h-[44px] focus:outline-none focus:border-amber-500"
        />

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-white min-h-[44px]">
            Cancel
          </button>
          <button type="submit" className="flex-1 py-2.5 rounded-lg bg-amber-500 text-gray-950 font-medium min-h-[44px]">
            Add
          </button>
        </div>
      </form>
    </div>
  );
}

function Delta({ label, base, scenario, format = formatZAR }) {
  const diff = scenario - base;
  const positive = diff >= 0;
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-white">{label}</span>
      <span className={positive ? "text-green-500" : "text-red-400"}>
        {positive ? "+" : ""}{format(diff)}
      </span>
    </div>
  );
}

export default function WhatIf({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [recurringItems, setRecurringItems] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "scenarios"), where("uid", "==", user.uid));
    return onSnapshot(q, (snap) => setScenarios(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user?.uid]);

  const activeScenario = scenarios.find((s) => s.id === activeId) || null;

  const baseBalance = useMemo(() => computeBalance(transactions), [transactions]);
  const baseSafeToSpend = useMemo(() => computeSafeToSpend(transactions, recurringItems, baseBalance), [transactions, recurringItems, baseBalance]);
  const baseRunway = useMemo(() => computeRunway(transactions, baseBalance), [transactions, baseBalance]);
  const baseEOY = useMemo(() => computeEndOfYearBalance(transactions, recurringItems, baseBalance), [transactions, recurringItems, baseBalance]);
  const baseChartData = useMemo(() => buildMonthlyChartData(transactions, recurringItems), [transactions, recurringItems]);

  const scenarioTransactions = useMemo(() => {
    if (!activeScenario) return transactions;
    const items = (activeScenario.items || []).map((it, i) => ({ ...it, id: `scenario-${i}` }));
    return [...transactions, ...items];
  }, [transactions, activeScenario]);

  const scenarioBalance = useMemo(() => computeBalance(scenarioTransactions), [scenarioTransactions]);
  const scenarioSafeToSpend = useMemo(
    () => computeSafeToSpend(scenarioTransactions, recurringItems, scenarioBalance),
    [scenarioTransactions, recurringItems, scenarioBalance]
  );
  const scenarioRunway = useMemo(() => computeRunway(scenarioTransactions, scenarioBalance), [scenarioTransactions, scenarioBalance]);
  const scenarioEOY = useMemo(
    () => computeEndOfYearBalance(scenarioTransactions, recurringItems, scenarioBalance),
    [scenarioTransactions, recurringItems, scenarioBalance]
  );
  const scenarioChartData = useMemo(
    () => (activeScenario ? buildMonthlyChartData(scenarioTransactions, recurringItems) : null),
    [activeScenario, scenarioTransactions, recurringItems]
  );

  const handleCreateScenario = async (e) => {
    e.preventDefault();
    if (!newName.trim() || scenarios.length >= MAX_SCENARIOS) return;
    const ref = await addDoc(collection(db, "scenarios"), { uid: user.uid, name: newName.trim(), items: [] });
    setNewName("");
    setShowNewForm(false);
    setActiveId(ref.id);
  };

  const handleDeleteScenario = async (id) => {
    if (!window.confirm("Delete this scenario?")) return;
    await deleteDoc(doc(db, "scenarios", id));
    if (activeId === id) setActiveId(null);
  };

  const handleAddItem = async (item) => {
    if (!activeScenario) return;
    const items = [...(activeScenario.items || []), item];
    await updateDoc(doc(db, "scenarios", activeScenario.id), { items });
  };

  const handleRemoveItem = async (index) => {
    if (!activeScenario) return;
    const items = (activeScenario.items || []).filter((_, i) => i !== index);
    await updateDoc(doc(db, "scenarios", activeScenario.id), { items });
  };

  const runwayText = (r) => (r.months === Infinity ? "âˆž" : `${r.months.toFixed(1)}mo`);

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveId(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap min-h-[32px] ${
            !activeId ? "bg-blue-500 text-white" : "bg-gray-900 text-white border border-gray-800"
          }`}
        >
          Base
        </button>
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap min-h-[32px] ${
              activeId === s.id ? "bg-amber-500 text-gray-950" : "bg-gray-900 text-white border border-gray-800"
            }`}
          >
            {s.name}
          </button>
        ))}
        {scenarios.length < MAX_SCENARIOS && (
          <button
            onClick={() => setShowNewForm(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap min-h-[32px] border border-dashed border-gray-700 text-white"
          >
            + New
          </button>
        )}
      </div>

      <CashFlowChart data={baseChartData} scenarioData={scenarioChartData} />

      {activeScenario ? (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white text-sm font-semibold">{activeScenario.name} vs Base</h3>
              <button onClick={() => handleDeleteScenario(activeScenario.id)} className="text-[11px] text-white hover:text-red-400">
                Delete scenario
              </button>
            </div>
            <Delta label="Safe-to-Spend" base={baseSafeToSpend} scenario={scenarioSafeToSpend} />
            <Delta label="End-of-Year Balance" base={baseEOY} scenario={scenarioEOY} />
            <Delta
              label="Runway"
              base={baseRunway.months === Infinity ? 0 : baseRunway.months}
              scenario={scenarioRunway.months === Infinity ? 0 : scenarioRunway.months}
              format={(v) => `${v >= 0 ? "" : ""}${v.toFixed(1)}mo`}
            />
            <div className="flex justify-between text-[10px] text-white mt-1 pt-1 border-t border-gray-800">
              <span>Base runway: {runwayText(baseRunway)}</span>
              <span>Scenario runway: {runwayText(scenarioRunway)}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white text-sm font-semibold">Hypothetical Items</h3>
              <button
                onClick={() => setShowItemForm(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-gray-950 font-medium min-h-[36px]"
              >
                + Add
              </button>
            </div>
            {(activeScenario.items || []).length === 0 ? (
              <div className="text-white text-sm text-center py-6 bg-gray-900 border border-gray-800 rounded-xl">
                No hypothetical items yet.
              </div>
            ) : (
              <div className="space-y-2">
                {activeScenario.items.map((it, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white text-sm font-medium truncate">{it.description}</div>
                      <div className="text-white text-xs">{it.date} Â· {it.category}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-amber-400">
                        {it.type === "income" ? "+" : "-"}{formatZAR(it.amount)}
                      </span>
                      <button onClick={() => handleRemoveItem(i)} className="text-white hover:text-red-400 text-xs w-7 h-7 flex items-center justify-center">
                        âœ•
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-white text-sm text-center py-6">
          Viewing base numbers. Select or create a scenario to explore what-if outcomes.
        </div>
      )}

      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowNewForm(false)} />
          <form onSubmit={handleCreateScenario} className="relative w-full max-w-md bg-gray-900 border-t border-gray-800 rounded-t-xl p-4 pb-6">
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
            <h2 className="text-white text-lg font-semibold mb-4">New Scenario</h2>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Hire a contractor"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white mb-4 min-h-[44px] focus:outline-none focus:border-amber-500"
              autoFocus
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowNewForm(false)} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-white min-h-[44px]">
                Cancel
              </button>
              <button type="submit" className="flex-1 py-2.5 rounded-lg bg-amber-500 text-gray-950 font-medium min-h-[44px]">
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {showItemForm && <ScenarioItemForm onAdd={handleAddItem} onClose={() => setShowItemForm(false)} />}
    </div>
  );
}
