import { formatZAR } from "../utils/format";
import { categoryColor } from "../utils/categories";

export default function CategoryBreakdown({ data }) {
  if (data.length === 0) {
    return (
      <div className="bg-gray-900 border border-white/[0.08] rounded-xl p-6 text-white/50 text-sm text-center">
        No expenses logged this month yet.
      </div>
    );
  }

  const max = data[0].amount;

  return (
    <div className="bg-gray-900 border border-white/[0.08] rounded-xl p-4 space-y-4">
      {data.map(({ category, amount }) => {
        const color = categoryColor(category);
        const pct = max > 0 ? Math.max(4, (amount / max) * 100) : 0;
        return (
          <div key={category}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-white text-sm truncate">{category}</span>
              </div>
              <span className="text-white text-sm font-medium flex-shrink-0">{formatZAR(amount)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
