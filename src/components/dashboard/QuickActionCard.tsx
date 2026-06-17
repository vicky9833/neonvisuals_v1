import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
  icon: LucideIcon;
  tint: "gold" | "navy" | "cream";
}

const TINTS: Record<QuickActionCardProps["tint"], string> = {
  gold: "from-gold/10 to-transparent",
  navy: "from-navy/5 to-transparent",
  cream: "from-secondary to-transparent",
};

export function QuickActionCard({
  title,
  description,
  href,
  buttonLabel,
  icon: Icon,
  tint,
}: QuickActionCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-[#EDE9E3] bg-linear-to-br p-6 shadow-sm",
        TINTS[tint],
      )}
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-lg",
          tint === "gold" ? "bg-gold/15 text-gold" : "bg-navy/10 text-navy",
        )}
      >
        <Icon className="size-5" />
      </span>
      <h3 className="font-heading mt-4 text-base font-semibold text-navy">
        {title}
      </h3>
      <p className="mt-1 flex-1 text-sm text-[#6B7280]">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-gold"
      >
        {buttonLabel}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
