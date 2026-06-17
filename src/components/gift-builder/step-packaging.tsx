import type { Dispatch } from "react";
import { PACKAGING_TIERS, type KitAction, type KitBuilderState } from "@/lib/gift-builder";
import { PackagingCard } from "@/components/gift-builder/packaging-card";

export function StepPackaging({
  state,
  dispatch,
  onContinue,
  onBack,
}: {
  state: KitBuilderState;
  dispatch: Dispatch<KitAction>;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A]">
        How Should We Package Your Kit?
      </h2>
      <p className="mt-2 text-[#666666]">
        Every tier includes the recipient&apos;s name on the box. Premium and above include
        our signature wax seal and narrative card.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PACKAGING_TIERS.map((tier) => (
          <PackagingCard
            key={tier.id}
            tier={tier}
            selected={state.packagingTier === tier.id}
            onSelect={() => dispatch({ type: "SET_PACKAGING", tier: tier.id })}
          />
        ))}
      </div>

      <div className="mt-10 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-12 items-center rounded-full border border-[#EDE9E3] px-6 text-sm font-semibold text-navy transition-colors hover:bg-secondary"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-12 items-center rounded-full bg-navy px-8 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
        >
          Continue to Personalisation →
        </button>
      </div>
    </div>
  );
}
