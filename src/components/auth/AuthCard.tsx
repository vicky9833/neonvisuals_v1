import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Rendered below the card body (e.g. "Don't have an account?"). */
  footer?: ReactNode;
}

/** Centred card wrapper shared by all auth screens. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#EDE9E3] bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo variant="full" theme="dark" className="mb-5" asLink={false} />
            <h1 className="font-heading text-2xl font-bold text-navy">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-[#6B7280]">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </div>
        {footer ? (
          <p className="mt-6 text-center text-sm text-[#6B7280]">{footer}</p>
        ) : null}
      </div>
    </div>
  );
}
