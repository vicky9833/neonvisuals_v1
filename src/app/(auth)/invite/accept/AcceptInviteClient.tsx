"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "./actions";

export function AcceptInviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleAccept() {
    setError(null);
    setSubmitting(true);
    const result = await acceptInvite(token);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Could not accept this invite.");
      return;
    }
    setDone(true);
    toast.success("You're in!", { description: "Welcome to the team." });
    router.push("/dashboard");
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      <Button
        onClick={handleAccept}
        disabled={submitting || done}
        className="h-11 w-full rounded-lg bg-navy text-white hover:bg-navy/90"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : done ? (
          <>
            <Check className="size-4" /> Joined
          </>
        ) : (
          "Accept invitation"
        )}
      </Button>
    </div>
  );
}
