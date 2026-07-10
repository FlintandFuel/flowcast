import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { formatZAR } from "../utils/format";
import { categoriesForType } from "../utils/categories";
import { parseCSV, parseFlexibleDate, parseAmount, BANK_PRESETS, guessColumn } from "../utils/csv";

const SCREENSHOT_PROMPT = `Extract all visible transactions from this banking app screenshot as a JSON array.
Each item must be an object with exactly these fields:
- date: string in YYYY-MM-DD format (infer the year if not shown, assume the current year unless context suggests otherwise)
- description: string, the transaction description or merchant name
- amount: positive number, no currency symbol or commas
- type: either "income" or "expense", inferred from whether the amount is money in (positive/green/credit) or money out (negative/red/debit), or from context

Respond with ONLY the raw JSON array. No markdown code fences, no explanation, no extra text.`;

function emptyRow(overrides = {}) {
  const type = overrides.type === "income" ? "income" : "expense";
  return {
    date: "",
    description: "",
    amount: 0,
    type,
    category: type === "income" ? "Other Income" : "Other Expense",
    include: true,
    ...overrides,
  };
}

function PreviewTable({ rows, setRows, onConfirm, onCancel, confirming }) {
  const updateRow = (i, patch) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const includedCount = rows.filter((r) => r.include).length;

  return (
    <div className="space-y-3">
      <div className="text-xs text-white">{includedCount} of {rows.length} rows will be imported</div>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {rows.map((r, i) => (
          <div key={i} className={`bg-gray-900 border border-gray-800 rounded-xl p-3 ${!r.include ? "opacity-40" : ""}`}>
            <div className="flex items-start gap-2 mb-2">
              <input
                type="checkbox"
                checked={r.include}
                onChange={(e) => updateRow(i, { include: e.target.checked })}
                className="mt-1 w-4 h-4 flex-shrink-0"
              />
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={r.date}
                  onChange={(e) => updateRow(i, { date: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs min-h-[36px]"
                />
                <input
                  type="number"
                  step="0.01"
                  value={r.amount}
                  onChange={(e) => updateRow(i, { amount: parseFloat(e.target.value) || 0 })}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs min-h-[36px]"
                />
              </div>
            </div>
            <input
              type="text"
              value={r.description}
              onChange={(e) => updateRow(i, { description: e.target.value })}
              placeholder="Description"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs mb-2 min-h-[36px]"
            />
            <div className="flex gap-2">
              <div className="flex rounded-lg overflow-hidden border border-gray-700 flex-shrink-0">
                {["income", "expense"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateRow(i, { type: t, category: categoriesForType(t)[categoriesForType(t).length - 1] })}
                    className={`px-2.5 py-1.5 text-[11px] font-medium min-h-[36px] ${
                      r.type === t
                        ? t === "income" ? "bg-green-500/20 text-green-500" : "bg-red-400/20 text-red-400"
                        : "text-white"
                    }`}
                  >
                    {t === "income" ? "In" : "Out"}
                  </button>
                ))}
              </div>
              <select
                value={r.category}
                onChange={(e) => updateRow(i, { category: e.target.value })}
                className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs min-h-[36px]"
              >
                {categoriesForType(r.type).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-white min-h-[44px]">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={confirming || includedCount === 0}
          className="flex-1 py-2.5 rounded-lg bg-blue-500 text-white font-medium min-h-[44px] disabled:opacity-50"
        >
          {confirming ? "Importing..." : `Import ${includedCount}`}
        </button>
      </div>
    </div>
  );
}

function SuccessSummary({ summary, onDone }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
      <div className="text-white text-sm font-semibold">Import complete</div>
      <div className="text-white text-sm">{summary.count} transactions imported</div>
      <div className="flex justify-between text-sm">
        <span className="text-white">Total income</span>
        <span className="text-green-500">{formatZAR(summary.income)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-white">Total expenses</span>
        <span className="text-red-400">{formatZAR(summary.expense)}</span>
      </div>
      <button onClick={onDone} className="w-full mt-2 py-2.5 rounded-lg bg-blue-500 text-white font-medium min-h-[44px]">
        Done
      </button>
    </div>
  );
}

function CsvImport({ user }) {
  const [bankKey, setBankKey] = useState("generic");
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({ dateCol: -1, descCol: -1, amountCol: -1, useSplit: false, debitCol: -1, creditCol: -1 });
  const [rows, setRows] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const applyPreset = (key, hdrs) => {
    const preset = BANK_PRESETS[key];
    const dateCol = guessColumn(hdrs, preset.date);
    const descCol = guessColumn(hdrs, preset.description);
    const amountCol = guessColumn(hdrs, preset.amount);
    const debitCol = guessColumn(hdrs, preset.debit);
    const creditCol = guessColumn(hdrs, preset.credit);
    const useSplit = amountCol === -1 && debitCol !== -1 && creditCol !== -1;
    setMapping({ dateCol, descCol, amountCol, useSplit, debitCol, creditCol });
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setSummary(null);
    setRows(null);
    const text = await file.text();
    const { headers: hdrs, rows: dataRows } = parseCSV(text);
    if (!hdrs.length) {
      setError("Could not read any columns from that file.");
      return;
    }
    setHeaders(hdrs);
    setRawRows(dataRows);
    applyPreset(bankKey, hdrs);
  };

  const handleBankChange = (key) => {
    setBankKey(key);
    if (headers.length) applyPreset(key, headers);
  };

  const buildPreview = () => {
    const { dateCol, descCol, amountCol, useSplit, debitCol, creditCol } = mapping;
    if (dateCol === -1 || descCol === -1 || (!useSplit && amountCol === -1) || (useSplit && (debitCol === -1 || creditCol === -1))) {
      setError("Map date, description and amount columns before continuing.");
      return;
    }
    setError("");
    const preview = rawRows
      .map((r) => {
        const date = parseFlexibleDate(r[dateCol]);
        const description = (r[descCol] || "").trim();
        let amount;
        let type;
        if (useSplit) {
          const debit = parseAmount(r[debitCol]);
          const credit = parseAmount(r[creditCol]);
          if (credit > 0) { amount = credit; type = "income"; }
          else { amount = Math.abs(debit); type = "expense"; }
        } else {
          const raw = parseAmount(r[amountCol]);
          amount = Math.abs(raw);
          type = raw < 0 ? "expense" : "income";
        }
        return emptyRow({ date, description, amount, type, include: !!(date && description && amount) });
      })
      .filter((r) => r.description || r.amount);
    setRows(preview);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const toImport = rows.filter((r) => r.include && r.amount > 0 && r.date);
      let income = 0, expense = 0;
      for (const r of toImport) {
        await addDoc(collection(db, "transactions"), {
          uid: user.uid,
          date: r.date,
          description: r.description || "Imported transaction",
          category: r.category,
          amount: r.amount,
          type: r.type,
          recurring: false,
          createdAt: serverTimestamp(),
        });
        if (r.type === "income") income += r.amount; else expense += r.amount;
      }
      setSummary({ count: toImport.length, income, expense });
      setRows(null);
    } catch (err) {
      console.error(err);
      setError("Import failed. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  if (summary) {
    return <SuccessSummary summary={summary} onDone={() => { setSummary(null); setHeaders([]); setRawRows([]); }} />;
  }

  if (rows) {
    return (
      <PreviewTable
        rows={rows}
        setRows={setRows}
        onConfirm={handleConfirm}
        onCancel={() => setRows(null)}
        confirming={confirming}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-white mb-1">Bank</label>
        <select
          value={bankKey}
          onChange={(e) => handleBankChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white min-h-[44px]"
        >
          {Object.entries(BANK_PRESETS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <label className="flex flex-col items-center justify-center border border-dashed border-gray-700 rounded-xl py-8 cursor-pointer text-white text-sm">
        <span>Tap to upload bank statement CSV</span>
        <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
      </label>

      {headers.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2">
          <div className="text-white text-sm font-medium">Map columns</div>
          {[
            { key: "dateCol", label: "Date" },
            { key: "descCol", label: "Description" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-white flex-shrink-0">{label}</span>
              <select
                value={mapping[key]}
                onChange={(e) => setMapping((m) => ({ ...m, [key]: Number(e.target.value) }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs min-h-[36px] flex-1 min-w-0"
              >
                <option value={-1}>Select column</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                ))}
              </select>
            </div>
          ))}

          <label className="flex items-center gap-2 text-xs text-white py-1">
            <input
              type="checkbox"
              checked={mapping.useSplit}
              onChange={(e) => setMapping((m) => ({ ...m, useSplit: e.target.checked }))}
            />
            Separate debit / credit columns
          </label>

          {mapping.useSplit ? (
            <>
              {[{ key: "debitCol", label: "Debit (money out)" }, { key: "creditCol", label: "Credit (money in)" }].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white flex-shrink-0">{label}</span>
                  <select
                    value={mapping[key]}
                    onChange={(e) => setMapping((m) => ({ ...m, [key]: Number(e.target.value) }))}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs min-h-[36px] flex-1 min-w-0"
                  >
                    <option value={-1}>Select column</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              ))}
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-white flex-shrink-0">Amount</span>
              <select
                value={mapping.amountCol}
                onChange={(e) => setMapping((m) => ({ ...m, amountCol: Number(e.target.value) }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs min-h-[36px] flex-1 min-w-0"
              >
                <option value={-1}>Select column</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                ))}
              </select>
            </div>
          )}

          <div className="text-[10px] text-white">{rawRows.length} rows found</div>

          <button onClick={buildPreview} className="w-full py-2.5 rounded-lg bg-blue-500 text-white font-medium min-h-[44px]">
            Preview import
          </button>
        </div>
      )}

      {error && <div className="text-red-400 text-xs">{error}</div>}
    </div>
  );
}

function ScreenshotImport({ user }) {
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [summary, setSummary] = useState(null);

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setRows(null);
    setSummary(null);
    setError("");
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleProcess = async () => {
    if (!imageFile) return;
    if (!apiKey) {
      setError("Missing VITE_ANTHROPIC_API_KEY. Add it to your .env file.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const base64Data = await fileToBase64(imageFile);
      const mediaType = imageFile.type || "image/jpeg";

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
                { type: "text", text: SCREENSHOT_PROMPT },
              ],
            },
          ],
        }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`API error ${resp.status}: ${body.slice(0, 200)}`);
      }

      const data = await resp.json();
      const text = data?.content?.find((c) => c.type === "text")?.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Could not find transaction data in the response.");
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("No transactions detected in that image.");

      const preview = parsed.map((t) =>
        emptyRow({
          date: parseFlexibleDate(t.date) || "",
          description: String(t.description || "").trim(),
          amount: Math.abs(parseFloat(t.amount) || 0),
          type: t.type === "income" ? "income" : "expense",
          include: true,
        })
      );
      setRows(preview);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not process that image. Try a clearer screenshot.");
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const toImport = rows.filter((r) => r.include && r.amount > 0 && r.date);
      let income = 0, expense = 0;
      for (const r of toImport) {
        await addDoc(collection(db, "transactions"), {
          uid: user.uid,
          date: r.date,
          description: r.description || "Imported transaction",
          category: r.category,
          amount: r.amount,
          type: r.type,
          recurring: false,
          createdAt: serverTimestamp(),
        });
        if (r.type === "income") income += r.amount; else expense += r.amount;
      }
      setSummary({ count: toImport.length, income, expense });
      setRows(null);
    } catch (err) {
      console.error(err);
      setError("Import failed. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  if (summary) {
    return (
      <SuccessSummary
        summary={summary}
        onDone={() => { setSummary(null); setImageFile(null); setImageUrl(null); }}
      />
    );
  }

  if (rows) {
    return <PreviewTable rows={rows} setRows={setRows} onConfirm={handleConfirm} onCancel={() => setRows(null)} confirming={confirming} />;
  }

  return (
    <div className="space-y-3">
      <label className="flex flex-col items-center justify-center border border-dashed border-gray-700 rounded-xl py-8 cursor-pointer text-white text-sm overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="Selected screenshot" className="max-h-56 rounded-lg" />
        ) : (
          <span>Tap to upload a banking app screenshot</span>
        )}
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      {imageFile && (
        <button
          onClick={handleProcess}
          disabled={processing}
          className="w-full py-2.5 rounded-lg bg-blue-500 text-white font-medium min-h-[44px] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Reading transactions...
            </>
          ) : (
            "Extract transactions"
          )}
        </button>
      )}

      {error && <div className="text-red-400 text-xs">{error}</div>}
    </div>
  );
}

export default function Import({ user }) {
  const [method, setMethod] = useState("csv");

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex rounded-lg overflow-hidden border border-gray-800">
        <button
          onClick={() => setMethod("csv")}
          className={`flex-1 py-2.5 text-sm font-medium min-h-[44px] transition ${
            method === "csv" ? "bg-blue-500 text-white" : "text-white"
          }`}
        >
          CSV Upload
        </button>
        <button
          onClick={() => setMethod("screenshot")}
          className={`flex-1 py-2.5 text-sm font-medium min-h-[44px] transition ${
            method === "screenshot" ? "bg-blue-500 text-white" : "text-white"
          }`}
        >
          Screenshot
        </button>
      </div>

      {method === "csv" ? <CsvImport user={user} /> : <ScreenshotImport user={user} />}
    </div>
  );
}
