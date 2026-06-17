import Link from "next/link";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPANY_NAME } from "@/lib/utils/constants";

interface LogoProps {
  className?: string;
  /** Render as a plain element instead of a link to home. */
  asLink?: boolean;
}

/**
 * Neon Visuals lockup: a navy tile with a gold gift mark + "NEON VISUALS"
 * wordmark. `className` controls the wordmark colour (e.g. cream on dark).
 */
export function Logo({ className, asLink = true }: LogoProps) {
  const content = (
    <span className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-navy">
        <Gift className="size-5 text-gold" />
      </span>
      <span
        className={cn(
          "text-lg font-extrabold uppercase tracking-tight text-navy",
          className,
        )}
      >
        {COMPANY_NAME}
      </span>
    </span>
  );

  if (!asLink) return content;

  return (
    <Link href="/" aria-label={`${COMPANY_NAME} home`}>
      {content}
    </Link>
  );
}
