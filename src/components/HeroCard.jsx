const TONE_CLASSES = {
  default: "text-white",
  blue: "text-blue-500",
  green: "text-green-500",
  yellow: "text-yellow-400",
  red: "text-red-400",
};

export default function HeroCard({ label, value, sublabel, tone = "default", children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-1 min-h-[104px] justify-between">
      <span className="text-white text-xs uppercase tracking-wide">{label}</span>
      {children ? (
        children
      ) : (
        <span className={`text-2xl font-bold leading-tight ${TONE_CLASSES[tone] || TONE_CLASSES.default}`}>
          {value}
        </span>
      )}
      {sublabel && <span className="text-white text-xs">{sublabel}</span>}
    </div>
  );
}
