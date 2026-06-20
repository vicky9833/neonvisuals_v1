interface KPIItem {
  label: string;
  value: string;
  accent?: "navy" | "gold" | "green" | "red";
}

const ACCENT: Record<string, string> = {
  navy: "text-navy",
  gold: "text-gold",
  green: "text-green-600",
  red: "text-red-600",
};

export function AnalyticsKPIRow({ items }: { items: KPIItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[#EDE9E3] bg-white p-4 shadow-sm"
        >
          <p className={`font-numbers text-2xl font-bold ${ACCENT[item.accent ?? "navy"]}`}>
            {item.value}
          </p>
          <p className="mt-0.5 text-xs font-medium text-[#6B7280]">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
