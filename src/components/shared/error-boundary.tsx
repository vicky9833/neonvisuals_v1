"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import Link from "next/link";
import { Gift } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback. When omitted, the branded fallback is shown. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Class-based React error boundary (functional components cannot catch render
 * errors). Renders a branded, non-scary fallback and logs the error. In
 * production this is where a monitoring hook (Sentry, etc.) would go.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log for now; swap for a monitoring service in production.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReload = (): void => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-5 bg-[#FAFAF8] px-6 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl border border-[#EDE9E3] bg-white">
          <Gift className="size-8 text-[#C4A35A]" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A2E]">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-md text-sm text-[#666666]">
            We&apos;re working on it. Please try refreshing the page.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-full bg-[#1A1A2E] px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-[#2a2a4e]"
          >
            Refresh Page
          </button>
          <Link
            href="/"
            className="rounded-full border-2 border-[#C4A35A] px-6 py-3 text-sm font-medium text-[#C4A35A] transition-all duration-300 hover:bg-[#C4A35A] hover:text-white"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }
}
