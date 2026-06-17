import { Check } from "lucide-react";
import type { OccasionOption } from "@/lib/gift-builder";

export function OccasionCard({
  option,
  selected,
  onSelect,
}: {
  option: OccasionOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-150 ${
        selected
          ? "border-gold bg-gold/10 shadow-sm"
          : "border-[#EDE9E3] bg-white hover:-translate-y-0.5 hover:shadow-sm"
      }`}
    >
      {selected ? (
        <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-gold text-navy">
          <Check className="size-4" />
        </span>
      ) : null}
      <span
        className={`flex size-12 items-center justify-center rounded-xl ${
          selected ? "bg-navy text-gold" : "bg-secondary text-navy"
        }`}
      >
        <Icon className="size-6" />
      </span>
      <span className="text-sm font-semibold text-[#1A1A1A]">{option.label}</span>
    </button>
  );
}
