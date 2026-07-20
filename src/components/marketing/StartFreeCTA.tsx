import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A quiet, SECONDARY "Start free" entry point into self-serve signup (/register).
 * Deliberately understated so the primary marketing CTAs (Curate a Kit / Request a
 * Quote / Get in Touch) stay dominant. Used on home, how-it-works, and blog posts.
 */
export function StartFreeCTA({ className }: { className?: string }) {
  return (
    <Link
      href="/register"
      className={cn(
        "group inline-flex items-center gap-1.5 text-sm font-semibold text-navy transition-colors hover:text-gold",
        className,
      )}
    >
      Start free
      <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  );
}
