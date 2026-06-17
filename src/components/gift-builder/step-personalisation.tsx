import type { Dispatch } from "react";
import {
  PERSONALISATION_LEVELS,
  TIMELINES,
  getPersonalisationLevel,
  type KitAction,
  type KitBuilderState,
} from "@/lib/gift-builder";
import { PersonalisationCard } from "@/components/gift-builder/personalisation-card";

export function StepPersonalisation({
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
  const showMessage = getPersonalisationLevel(state.personalisationLevel).hasMessage;

  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A]">Make Every Kit Personal</h2>
      <p className="mt-2 text-[#666666]">
        Tell us how you&apos;d like each kit personalised. Every item will carry the
        recipient&apos;s name.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {PERSONALISATION_LEVELS.map((level) => (
          <PersonalisationCard
            key={level.id}
            level={level}
            selected={state.personalisationLevel === level.id}
            onSelect={() => dispatch({ type: "SET_PERSONALISATION", level: level.id })}
          />
        ))}
      </div>

      {showMessage ? (
        <div className="mt-8 max-w-2xl">
          <label htmlFor="message" className="block text-sm font-semibold text-[#1A1A1A]">
            Sample message for the narrative card
          </label>
          <textarea
            id="message"
            rows={3}
            value={state.sampleMessage}
            onChange={(e) => dispatch({ type: "SET_FIELD", field: "sampleMessage", value: e.target.value })}
            placeholder="e.g., 'Dear Priya, your dedication over these 5 years has shaped who we are as a company. This is a small token of our immense gratitude. — Vikas, CEO'"
            className="mt-2 w-full rounded-xl border border-[#EDE9E3] bg-white p-4 text-sm focus-visible:border-gold focus-visible:outline-none"
          />
          <p className="mt-1.5 text-xs text-[#999999]">
            This is a sample. You&apos;ll provide individual messages later — or we can craft them for you.
          </p>
        </div>
      ) : null}

      <div className="mt-8 max-w-2xl">
        <label htmlFor="special" className="block text-sm font-semibold text-[#1A1A1A]">
          Any special requirements?
        </label>
        <textarea
          id="special"
          rows={2}
          value={state.specialInstructions}
          onChange={(e) =>
            dispatch({ type: "SET_FIELD", field: "specialInstructions", value: e.target.value })
          }
          placeholder="e.g., 'Vegetarian-only food items', 'Deliver to 3 office locations', 'Include team photo in packaging'"
          className="mt-2 w-full rounded-xl border border-[#EDE9E3] bg-white p-4 text-sm focus-visible:border-gold focus-visible:outline-none"
        />
      </div>

      <fieldset className="mt-8">
        <legend className="text-sm font-semibold text-[#1A1A1A]">
          When do you need the kits delivered?
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {TIMELINES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => dispatch({ type: "SET_TIMELINE", timeline: t.id })}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                state.timeline === t.id
                  ? "border-navy bg-navy text-white"
                  : "border-[#EDE9E3] text-[#666666] hover:border-navy"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

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
          Review Your Kit →
        </button>
      </div>
    </div>
  );
}
