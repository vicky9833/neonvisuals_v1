import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Neon Visuals client account.",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create Your Account"
      subtitle="Start designing memorable gifting experiences for your team."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-gold hover:underline">
            Sign In →
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
