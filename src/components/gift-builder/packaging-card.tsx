import { Check } from "lucide-react";
import type { PackagingTier } from "@/lib/gift-builder";

export function PackagingCard({
  tier,
  selected,
  onSelect,
}: {
  tier: PackagingTier;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = tier.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative flex h-full flex-col rounded-2xl border p-6 text-left transition-all duration-150 ${
        selected
          ? "border-gold bg-gold/10 shadow-sm"
          : "border-[#EDE9E3] bg-white hover:-translate-y-0.5 hover:shadow-sm"
      }`}
    >
      {selected ? (
        <span className="absolute right-4 top-4 flex size-6 items-center justify-center rounded-full bg-gold text-navy">
          <Check className="size-4" />
        </span>
      ) : null}
      <span className="flex size-12 items-center justify-center rounded-xl bg-navy text-gold">
        <Icon className="size-6" />
      </span>
      <div className="mt-4 flex items-center gap-2">
        <h3 className="text-lg font-bold text-[#1A1A1A]">{tier.name}</h3>
        {tier.badge ? (
          <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-navy">
            {tier.badge}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[#666666]">{tier.description}</p>
      <p className="mt-3 text-xs font-medium text-[#888888]">Best for: {tier.bestFor}</p>
      <span className="mt-4 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            className={`size-2 rounded-full ${i < tier.dots ? "bg-gold" : "bg-[#EDE9E3]"}`}
          />
        ))}
      </span>
    </button>
  );
}
