import type { Dispatch } from "react";
import {
  OCCASIONS,
  QUANTITY_PRESETS,
  type KitAction,
  type KitBuilderState,
} from "@/lib/gift-builder";
import { OccasionCard } from "@/components/gift-builder/occasion-card";

export function StepOccasion({
  state,
  dispatch,
  onContinue,
}: {
  state: KitBuilderState;
  dispatch: Dispatch<KitAction>;
  onContinue: () => void;
}) {
  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A]">What&apos;s the Occasion?</h2>
      <p className="mt-2 text-[#666666]">
        Tell us what you&apos;re celebrating — we&apos;ll recommend the perfect products.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {OCCASIONS.map((o) => (
          <OccasionCard
            key={o.id}
            option={o}
            selected={state.occasion === o.id}
            onSelect={() => dispatch({ type: "SET_OCCASION", occasion: o.id })}
          />
        ))}
      </div>

      <div className="mt-10 max-w-md">
        <label htmlFor="qty" className="block text-sm font-semibold text-[#1A1A1A]">
          How many kits do you need?
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          value={state.quantity}
          onChange={(e) =>
            dispatch({ type: "SET_QUANTITY", quantity: Math.max(1, Number(e.target.value) || 1) })
          }
          className="mt-2 h-12 w-full rounded-xl border border-[#EDE9E3] bg-white px-4 text-sm focus-visible:border-gold focus-visible:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {QUANTITY_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => dispatch({ type: "SET_QUANTITY", quantity: p.value })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                state.quantity === p.value
                  ? "border-navy bg-navy text-white"
                  : "border-[#EDE9E3] text-[#666666] hover:border-navy"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[#999999]">For your quote request — no pricing is calculated.</p>
      </div>

      <div className="mt-10">
        <button
          type="button"
          disabled={!state.occasion}
          onClick={onContinue}
          className="inline-flex h-12 items-center rounded-full bg-navy px-8 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Choose Products →
        </button>
      </div>
    </div>
  );
}
