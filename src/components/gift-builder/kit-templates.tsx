import { ArrowRight, Sparkles } from "lucide-react";
import {
  TEMPLATES,
  resolveSkus,
  getOccasion,
  getPackagingTier,
  type KitTemplate,
} from "@/lib/gift-builder";

export function KitTemplates({
  onUseTemplate,
  onBuildOwn,
}: {
  onUseTemplate: (template: KitTemplate) => void;
  onBuildOwn: () => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
        Start from a Template or Build Your Own
      </h2>
      <div className="mt-6 flex gap-5 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-4">
        {TEMPLATES.map((t) => {
          const products = resolveSkus(t.skus);
          const occasion = getOccasion(t.occasion);
          const tier = getPackagingTier(t.packaging);
          return (
            <div
              key={t.id}
              className="flex w-[260px] shrink-0 flex-col rounded-2xl border border-[#EDE9E3] bg-white p-5 shadow-sm md:w-auto"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-navy text-gold">
                <Sparkles className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-[#1A1A1A]">{t.name}</h3>
              <span className="mt-1 text-xs font-medium text-gold">{occasion?.label}</span>
              <ul className="mt-3 flex-1 space-y-1.5">
                {products.map((p) => (
                  <li key={p.sku} className="flex gap-2 text-xs text-[#666666]">
                    <span className="text-gold">•</span>
                    {p.name}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-[#999999]">{tier.name} packaging</p>
              <button
                type="button"
                onClick={() => onUseTemplate(t)}
                className="group mt-4 inline-flex items-center justify-center gap-1 rounded-xl border border-navy py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
              >
                Use This Template
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onBuildOwn}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-gold px-8 text-[15px] font-semibold text-navy transition-all duration-200 hover:scale-[1.02] hover:brightness-105"
        >
          Or Build Your Own →
        </button>
      </div>
    </div>
  );
}
