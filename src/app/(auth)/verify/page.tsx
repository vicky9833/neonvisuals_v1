import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Verify email",
  description: "Verify your Neon Visuals account email.",
};

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md shadow-warm">
        <CardHeader className="space-y-3 text-center">
          <Logo className="mx-auto" asLink={false} />
          <CardTitle className="font-heading text-2xl">
            Check your inbox
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          We&apos;ve sent you a verification link. Follow it to activate your
          account.
        </CardContent>
      </Card>
    </div>
  );
}
