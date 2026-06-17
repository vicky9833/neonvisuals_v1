export function GiftStats({
  totalGifts,
  employeesGifted,
  deskTestScore,
  avgReaction,
}: {
  totalGifts: number;
  employeesGifted: number;
  deskTestScore: number;
  avgReaction: number;
}) {
  const items = [
    { value: totalGifts.toLocaleString("en-IN"), label: "Total Gifts" },
    { value: employeesGifted.toLocaleString("en-IN"), label: "Employees Gifted" },
    { value: `${deskTestScore}%`, label: "Desk Test Score" },
    { value: avgReaction > 0 ? `${avgReaction}/4` : "—", label: "Avg Reaction" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((i) => (
        <div
          key={i.label}
          className="rounded-xl border border-[#EDE9E3] bg-white p-4"
        >
          <p className="font-numbers text-2xl font-bold text-navy">{i.value}</p>
          <p className="text-xs text-[#6B7280]">{i.label}</p>
        </div>
      ))}
    </div>
  );
}
