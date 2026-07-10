const TONE_CLASSES = {
  default: "text-white",
  blue: "text-blue-500",
  green: "text-green-500",
  yellow: "text-yellow-400",
  red: "text-red-400",
};

const TONE_GRADIENTS = {
  default: "bg-gradient-to-br from-white to-blue-200",
  blue: "bg-gradient-to-br from-blue-300 to-blue-500",
  green: "bg-gradient-to-br from-green-300 to-green-500",
  yellow: "bg-gradient-to-br from-yellow-200 to-yellow-400",
  red: "bg-gradient-to-br from-red-300 to-red-400",
};

export default function HeroCard({ label, value, sublabel, tone = "default", hero = false, className = "", children }) {
  if (hero) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.08] p-5 ${className}`}>
        <div className="pointer-events-none absolute -top-14 -right-10 w-44 h-44 rounded-full bg-blue-500/10 blur-3xl" />
        <span className="relative block text-white/50 text-[11px] font-medium uppercase tracking-wider">{label}</span>
        <span
          className={`relative block mt-1.5 text-4xl font-bold leading-tight bg-clip-text text-transparent ${
            TONE_GRADIENTS[tone] || TONE_GRADIENTS.default
          }`}
        >
          {value}
        </span>
        {sublabel && <span className="relative block mt-1 text-white/40 text-xs">{sublabel}</span>}
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-white/[0.08] rounded-xl p-4 flex flex-col gap-1 min-h-[104px] justify-between ${className}`}>
      <span className="text-white/50 text-[11px] font-medium uppercase tracking-wider">{label}</span>
      {children ? (
        children
      ) : (
        <span className={`text-2xl font-bold leading-tight ${TONE_CLASSES[tone] || TONE_CLASSES.default}`}>
          {value}
        </span>
      )}
      {sublabel && <span className="text-white/40 text-xs">{sublabel}</span>}
    </div>
  );
}
