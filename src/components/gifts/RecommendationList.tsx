import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import type { GiftRecommendation } from "@/types/gift";

export function RecommendationList({
  recommendations,
}: {
  recommendations: GiftRecommendation[];
}) {
  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-[#6B7280]">
        No recommendations yet - record a gift or set an archetype to improve
        suggestions.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {recommendations.map((rec) => (
        <div
          key={rec.sku}
          className="rounded-lg border border-[#EDE9E3] bg-white p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy">
                {rec.sku} {rec.name}
              </p>
              <p className="mt-0.5 text-xs text-[#6B7280]">{rec.reason}</p>
              {rec.warnings.length > 0 ? (
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-700">
                  <AlertTriangle className="size-3" />
                  {rec.warnings[0]}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-xs font-semibold text-gold">
              {rec.score}
            </span>
          </div>
          <Link
            href={`/gift-builder?product=${rec.sku}`}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-gold"
          >
            Add to Kit <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ))}
    </div>
  );
}
