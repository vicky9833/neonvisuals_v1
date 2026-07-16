import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteClient } from "./AcceptInviteClient";

export const metadata: Metadata = {
  title: "Accept your invitation",
  description: "Join your team on Neon Visuals.",
  robots: { index: false, follow: false },
};

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginHref = `/login?redirect=${encodeURIComponent(`/invite/accept?token=${token ?? ""}`)}`;
  const registerHref = `/register?redirect=${encodeURIComponent(`/invite/accept?token=${token ?? ""}`)}`;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <div className="rounded-2xl border border-[#EDE9E3] bg-white p-8 shadow-sm">
        <h1 className="font-heading text-2xl font-bold text-navy">
          Join your team
        </h1>

        {!token ? (
          <p className="mt-3 text-sm text-destructive">
            This invite link is missing its token. Please use the link from your email.
          </p>
        ) : !user ? (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-[#6B7280]">
              Sign in with the email address your invitation was sent to, then return
              here to accept.
            </p>
            <div className="flex gap-3">
              <Link
                href={loginHref}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-navy text-sm font-semibold text-white hover:bg-navy/90"
              >
                Sign in
              </Link>
              <Link
                href={registerHref}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[#EDE9E3] text-sm font-semibold text-navy hover:bg-secondary"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-[#6B7280]">
              You&apos;re signed in as <strong>{user.email}</strong>. Accept to join the
              organisation you were invited to. If this isn&apos;t the invited address,
              sign in with the correct account first.
            </p>
            <AcceptInviteClient token={token} />
          </div>
        )}
      </div>
    </div>
  );
}
