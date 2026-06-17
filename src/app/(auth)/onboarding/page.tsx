import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/auth/OnboardingWizard";

export const metadata: Metadata = {
  title: "Set up your account",
  description: "Complete your company profile to get started with Neon Visuals.",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
