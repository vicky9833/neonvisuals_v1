import { Check } from "lucide-react";

const STEPS = [
  "Occasion",
  "Products",
  "Packaging",
  "Personalise",
  "Review",
];

export function StepProgress({
  current,
  maxReached,
  onStepClick,
}: {
  current: number;
  maxReached: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <div>
      {/* Mobile */}
      <p className="text-center text-sm font-semibold text-navy md:hidden">
        Step {current + 1} of {STEPS.length} - {STEPS[current]}
      </p>

      {/* Desktop */}
      <ol className="hidden items-center md:flex">
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          const reachable = i <= maxReached;
          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onStepClick(i)}
                className={`flex items-center gap-2 ${reachable ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    active
                      ? "bg-gold text-navy"
                      : done
                        ? "bg-navy text-gold"
                        : "bg-secondary text-[#999999]"
                  }`}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                <span
                  className={`text-sm font-medium ${active ? "text-navy" : done ? "text-[#555555]" : "text-[#AAAAAA]"}`}
                >
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 ? (
                <span className="mx-3 h-0.5 flex-1 overflow-hidden rounded-full bg-[#EDE9E3]">
                  <span
                    className="block h-full bg-gold transition-all duration-300"
                    style={{ width: i < current ? "100%" : "0%" }}
                  />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
