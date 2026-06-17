/**
 * Reusable breadcrumb. Last item is rendered as plain (current) text.
 */
import Link from "next/link";

export interface Crumb {
  name: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[#888888]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.name}-${i}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link href={item.href} className="transition-colors hover:text-navy">
                  {item.name}
                </Link>
              ) : (
                <span className={isLast ? "text-[#1A1A1A]" : undefined}>
                  {item.name}
                </span>
              )}
              {!isLast ? (
                <span aria-hidden="true" className="text-[#CCCCCC]">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
