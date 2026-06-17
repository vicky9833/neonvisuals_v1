"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth-client";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { GOOGLE_OAUTH_ENABLED } from "@/lib/auth-types";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    if (!result.ok) {
      setError(result.error ?? "Unable to sign in. Please try again.");
      setLoading(false);
      return;
    }
    // Middleware routes unboarded users to /onboarding automatically.
    router.replace(redirectTo);
    router.refresh();
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-gold hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              disabled={loading}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-lg pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-navy"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        {error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-lg bg-navy text-white hover:bg-navy/90"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign In"}
        </Button>
      </form>

      {GOOGLE_OAUTH_ENABLED ? (
        <>
          <Divider />
          <GoogleButton label="Sign in with Google" />
        </>
      ) : null}
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-[#EDE9E3]" />
      <span className="text-xs uppercase tracking-wide text-[#9CA3AF]">or</span>
      <span className="h-px flex-1 bg-[#EDE9E3]" />
    </div>
  );
}
