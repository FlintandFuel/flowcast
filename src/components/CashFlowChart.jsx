import { useState } from "react";
import { BarChart, Bar, XAxis, ReferenceLine, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { formatZAR, monthLabel } from "../utils/format";

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <div className="text-white font-medium mb-1">{d.label}</div>
      <div className="text-green-500">Income {formatZAR(d.income)}</div>
      <div className="text-red-400">Expense {formatZAR(d.expense)}</div>
      {d.scenarioNet !== undefined && <div className="text-amber-400">Scenario {formatZAR(d.scenarioNet)}</div>}
    </div>
  );
}

export default function CashFlowChart({ data, scenarioData }) {
  const defaultKey = data[6]?.key ?? data[0]?.key ?? null;
  const [selectedKey, setSelectedKey] = useState(defaultKey);

  const chartData = data.map((m, i) => ({
    ...m,
    label: monthLabel(m.year, m.month),
    scenarioNet: scenarioData ? scenarioData[i]?.net ?? 0 : undefined,
  }));

  const selected = chartData.find((m) => m.key === selectedKey) || chartData.find((m) => m.key === defaultKey);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: "#1f2937" }}
            tickLine={false}
            interval={0}
          />
          <ReferenceLine y={0} stroke="#374151" />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar
            dataKey="net"
            radius={[3, 3, 3, 3]}
            maxBarSize={16}
            onClick={(entry) => setSelectedKey(entry.key)}
            cursor="pointer"
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.key}
                fill={entry.net >= 0 ? "#3b82f6" : "#f87171"}
                opacity={entry.key === selectedKey ? 1 : entry.projected ? 0.5 : 0.85}
              />
            ))}
          </Bar>
          {scenarioData && (
            <Bar dataKey="scenarioNet" radius={[3, 3, 3, 3]} maxBarSize={16} fill="#f59e0b" opacity={0.75} />
          )}
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-3 mt-1 px-1 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />Actual/Positive</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />Negative</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500/50 inline-block" />Projected</span>
        {scenarioData && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />Scenario</span>}
      </div>

      {selected && (
        <div className="mt-3 border-t border-gray-800 pt-3 px-1">
          <div className="text-white text-sm font-medium mb-1">{selected.label} breakdown</div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Income</span>
            <span className="text-green-500">{formatZAR(selected.income)}</span>
          </div>
          <div className="flex justify-between text-xs mt-0.5">
            <span className="text-gray-500">Expenses</span>
            <span className="text-red-400">{formatZAR(selected.expense)}</span>
          </div>
          <div className="flex justify-between text-xs mt-0.5 font-medium">
            <span className="text-gray-400">Net</span>
            <span className={selected.net >= 0 ? "text-blue-500" : "text-red-400"}>{formatZAR(selected.net)}</span>
          </div>
          {selected.projected && <div className="text-[10px] text-gray-600 mt-1">Includes projected recurring items</div>}
        </div>
      )}
    </div>
  );
}
