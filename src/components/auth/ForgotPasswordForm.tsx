"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Unable to send reset link.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <CheckCircle2 className="mx-auto size-10 text-[#2D6A4F]" />
        <p className="text-sm text-[#6B7280]">
          Check your email for a password reset link. It may take a minute to
          arrive.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-gold hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-lg"
            placeholder="you@company.com"
          />
        </div>

        {error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-lg bg-navy text-white hover:bg-navy/90"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Send Reset Link"
          )}
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-gold hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
