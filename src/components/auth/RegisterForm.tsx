"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { signUp } from "@/lib/auth-client";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { GOOGLE_OAUTH_ENABLED } from "@/lib/auth-types";

export function RegisterForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    const phoneValue = phone.trim()
      ? phone.startsWith("+")
        ? phone.trim()
        : `+91${phone.trim()}`
      : undefined;
    const result = await signUp(email, password, fullName, phoneValue);
    if (!result.ok) {
      setError(result.error ?? "Unable to create your account.");
      setLoading(false);
      return;
    }

    // Session present (email confirmation off) → onboard. Otherwise verify.
    if (result.hasSession) {
      router.replace("/onboarding");
      router.refresh();
    } else {
      router.replace("/verify");
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            disabled={loading}
            onChange={(e) => setFullName(e.target.value)}
            className="h-11 rounded-lg"
            placeholder="Priya Sharma"
          />
        </div>

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
          <Label htmlFor="phone">Phone</Label>
          <div className="flex items-center gap-2">
            <span className="flex h-11 items-center rounded-lg border border-input px-3 text-sm text-[#6B7280]">
              +91
            </span>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              value={phone}
              disabled={loading}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 rounded-lg"
              placeholder="9019409590"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              disabled={loading}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-lg pr-10"
              placeholder="At least 8 characters"
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

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirm}
            disabled={loading}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-11 rounded-lg"
            placeholder="Re-enter your password"
          />
        </div>

        <label className="flex items-start gap-3 text-sm text-[#6B7280]">
          <Checkbox
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
            disabled={loading}
            className="mt-0.5"
          />
          <span>
            I agree to the Terms of Service and Privacy Policy.
          </span>
        </label>

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
            "Create Account"
          )}
        </Button>
      </form>

      {GOOGLE_OAUTH_ENABLED ? (
        <>
          <Divider />
          <GoogleButton label="Sign up with Google" />
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
