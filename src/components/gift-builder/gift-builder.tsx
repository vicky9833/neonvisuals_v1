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
    setStarted(true);
    goTo(0);
  }

  if (!started) {
    return <KitTemplates onUseTemplate={useTemplate} onBuildOwn={buildOwn} />;
  }

  return (
    <div ref={topRef} className="scroll-mt-24">
      <StepProgress current={step} maxReached={maxReached} onStepClick={goTo} />

      <div
        key={step}
        className="mt-10 duration-300 animate-in fade-in slide-in-from-right-4"
      >
        {step === 0 ? (
          <StepOccasion state={state} dispatch={dispatch} onContinue={() => goTo(1)} />
        ) : null}
        {step === 1 ? (
          <StepProducts state={state} dispatch={dispatch} buckets={buckets} onContinue={() => goTo(2)} />
        ) : null}
        {step === 2 ? (
          <StepPackaging state={state} dispatch={dispatch} onContinue={() => goTo(3)} onBack={() => goTo(1)} />
        ) : null}
        {step === 3 ? (
          <StepPersonalisation state={state} dispatch={dispatch} onContinue={() => goTo(4)} onBack={() => goTo(2)} />
        ) : null}
        {step === 4 ? (
          <StepReview state={state} dispatch={dispatch} onGoToStep={goTo} onBack={() => goTo(3)} />
        ) : null}
      </div>
    </div>
  );
}
