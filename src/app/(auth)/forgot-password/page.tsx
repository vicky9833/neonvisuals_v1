import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Reset your Neon Visuals account password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset Your Password"
      subtitle="Enter your email and we'll send you a reset link."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
