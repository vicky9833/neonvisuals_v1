"use client";

import { useReducer, useRef, useState } from "react";
import type { Bucket } from "@/lib/types/product";
import {
  kitReducer,
  initialKitState,
  resolveSkus,
  type KitTemplate,
} from "@/lib/gift-builder";
import { StepProgress } from "@/components/gift-builder/step-progress";
import { KitTemplates } from "@/components/gift-builder/kit-templates";
import { StepOccasion } from "@/components/gift-builder/step-occasion";
import { StepProducts } from "@/components/gift-builder/step-products";
import { StepPackaging } from "@/components/gift-builder/step-packaging";
import { StepPersonalisation } from "@/components/gift-builder/step-personalisation";
import { StepReview } from "@/components/gift-builder/step-review";
import { ErrorBoundary } from "@/components/shared/error-boundary";

export function GiftBuilder({ buckets }: { buckets: Bucket[] }) {
  const [state, dispatch] = useReducer(kitReducer, initialKitState);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  function goTo(index: number) {
    setStep(index);
    setMaxReached((m) => Math.max(m, index));
    requestAnimationFrame(() =>
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function useTemplate(t: KitTemplate) {
    dispatch({
      type: "LOAD_TEMPLATE",
      occasion: t.occasion,
      products: resolveSkus(t.skus),
      tier: t.packaging,
    });
    setStarted(true);
    goTo(2);
  }

  function buildOwn() {
    // Skip occasion selection and go straight to product selection (step 1).
    setStarted(true);
    goTo(1);
  }

  if (!started) {
    return <KitTemplates onUseTemplate={useTemplate} onBuildOwn={buildOwn} />;
  }

  return (
    // Perf-fix: guard against horizontal page scroll — the intentional overflow-x-auto rows
    // (recommended, collection filter, templates) scroll internally; the page never widens.
    <div ref={topRef} className="scroll-mt-24 max-w-full overflow-x-hidden">
      <StepProgress current={step} maxReached={maxReached} onStepClick={goTo} />

      <div
        key={step}
        className="mt-10 duration-300 animate-in fade-in slide-in-from-right-4"
      >
        {step === 0 ? (
          <ErrorBoundary>
            <StepOccasion state={state} dispatch={dispatch} onContinue={() => goTo(1)} />
          </ErrorBoundary>
        ) : null}
        {step === 1 ? (
          <ErrorBoundary>
            <StepProducts state={state} dispatch={dispatch} buckets={buckets} onContinue={() => goTo(2)} />
          </ErrorBoundary>
        ) : null}
        {step === 2 ? (
          <ErrorBoundary>
            <StepPackaging state={state} dispatch={dispatch} onContinue={() => goTo(3)} onBack={() => goTo(1)} />
          </ErrorBoundary>
        ) : null}
        {step === 3 ? (
          <ErrorBoundary>
            <StepPersonalisation state={state} dispatch={dispatch} onContinue={() => goTo(4)} onBack={() => goTo(2)} />
          </ErrorBoundary>
        ) : null}
        {step === 4 ? (
          <ErrorBoundary>
            <StepReview state={state} dispatch={dispatch} onGoToStep={goTo} onBack={() => goTo(3)} />
          </ErrorBoundary>
        ) : null}
      </div>
    </div>
  );
}
