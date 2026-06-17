import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/** Friendly empty placeholder for lists and tables. */
export function EmptyState({
  title,
  description,
  icon,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-card/50 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-4 text-muted-foreground">
        {icon ?? <Inbox className="size-10" />}
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
