import {
  ArrowRight,
  Crown,
  GraduationCap,
  Handshake,
  Package,
  Plus,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import {
  TEMPLATES,
  resolveSkus,
  getOccasion,
  getPackagingTier,
  type KitTemplate,
  type PackagingTierId,
} from "@/lib/gift-builder";

/** Map each template to a unique icon by id. */
const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  welcome: Package,
  legacy: Trophy,
  diwali: Sparkles,
  "ceo-star": Crown,
  "client-thankyou": Handshake,
  "college-fest": GraduationCap,
};

/** Packaging-tier badge styles. Standard = gray, Premium = gold, Flagship = navy-with-gold-text. */
const TIER_BADGE_CLASSES: Record<PackagingTierId, string> = {
  essential: "bg-[#F1F1F1] text-[#666666]",
  standard: "bg-[#F1F1F1] text-[#666666]",
  premium: "bg-[#C4A35A] text-white",
  flagship: "bg-[#1A1A2E] text-[#C4A35A]",
};

export function KitTemplates({
  onUseTemplate,
  onBuildOwn,
}: {
  onUseTemplate: (template: KitTemplate) => void;
  onBuildOwn: () => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">
        Start from a Template or Build Your Own
      </h2>
      <div className="mt-6 flex gap-5 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const products = resolveSkus(t.skus);
          const occasion = getOccasion(t.occasion);
          const tier = getPackagingTier(t.packaging);
          const Icon = TEMPLATE_ICONS[t.id] ?? Sparkles;
          const itemCount = t.skus.length;
          return (
            <div
              key={t.id}
              className="flex w-[280px] shrink-0 flex-col rounded-2xl border border-[#EDE9E3] bg-[#FAFAF8] p-5 shadow-sm md:w-auto"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-[#1A1A2E] text-[#C4A35A]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-[#1A1A2E]">{t.name}</h3>
              {occasion ? (
                <span className="mt-1 text-xs font-medium text-[#C4A35A]">
                  {occasion.label}
                </span>
              ) : null}
              <p className="mt-2 text-sm leading-relaxed text-[#666666]">
                {t.description}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-[#1A1A2E] ring-1 ring-[#EDE9E3]">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${TIER_BADGE_CLASSES[t.packaging]}`}
                >
                  {tier.name}
                </span>
              </div>

              {products.length > 0 ? (
                <ul className="mt-3 flex-1 space-y-1">
                  {products.map((p, i) => (
                    <li
                      key={`${p.sku}-${i}`}
                      className="flex gap-2 text-xs text-[#666666]"
                    >
                      <span className="text-[#C4A35A]">•</span>
                      {p.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex-1" />
              )}

              <button
                type="button"
                onClick={() => onUseTemplate(t)}
                className="group mt-4 inline-flex items-center justify-center gap-1 rounded-full border border-[#1A1A2E] py-2.5 text-sm font-semibold text-[#1A1A2E] transition-colors hover:bg-[#1A1A2E] hover:text-white"
              >
                Use This Template
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          );
        })}

        {/* Build Your Own card */}
        <div className="flex w-[280px] shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#C4A35A] bg-[#FAFAF8] p-5 text-center md:w-auto">
          <span className="flex size-11 items-center justify-center rounded-full border-2 border-dashed border-[#C4A35A] text-[#C4A35A]">
            <Plus className="size-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-base font-bold text-[#1A1A2E]">
            Build Your Own Kit
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#666666]">
            Start from scratch and pick exactly what you want.
          </p>
          <button
            type="button"
            onClick={onBuildOwn}
            className="mt-4 inline-flex items-center justify-center gap-1 rounded-full bg-[#C4A35A] px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-105"
          >
            Start Building →
          </button>
        </div>
      </div>
    </div>
  );
}
