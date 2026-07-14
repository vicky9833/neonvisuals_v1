import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Page Not Found | Neon Visuals",
  description:
    "The page you're looking for doesn't exist or has been moved. Explore our corporate gifting experiences instead.",
};

/** Branded 404 page (Server Component). */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF8] px-6 py-24 text-center">
      <Logo variant="full" theme="dark" />

      <h1 className="mt-10 text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">
        Page Not Found
      </h1>
      <p className="mt-4 max-w-md text-base text-[#333333]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#1A1A2E] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#25253f]"
        >
          Go Home
        </Link>
        <Link
          href="/products"
          className="inline-flex h-11 items-center justify-center rounded-full border border-[#C4A35A] px-7 text-sm font-semibold text-[#1A1A2E] transition-colors hover:bg-[#C4A35A]/10"
        >
          Browse Products
        </Link>
      </div>
    </main>
  );
}
