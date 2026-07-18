import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext, authorizeTenant } from "@/lib/authz/context";
import { getProfile } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BrandingForm } from "@/components/dashboard/BrandingForm";

export const metadata: Metadata = {
  title: "Company Settings",
  description: "Manage your company profile and branding.",
  robots: { index: false, follow: false },
};

/**
 * P9d (R1) — company settings (branding). settings.manage-gated (org_owner/org_admin). Branding
 * renders in the org's OWN portal shell; null → NEON fallback.
 */
export default async function CompanySettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?redirect=%2Fdashboard%2Fsettings%2Fcompany");
  const companyId = ctx.activeCompanyId;
  if (!companyId) redirect("/onboarding");

  const canManage = authorizeTenant(ctx, companyId, "settings.manage").effect === "allow";
  if (!canManage) {
    return (
      <div className="space-y-6">
        <PageHeader title="Company Settings" description="Manage your company profile and branding." />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Only an owner or admin can manage company settings.
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = await getProfile();
  const company = profile?.company ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Settings"
        description="Set your logo and brand colors — they appear across your dashboard."
      />
      <BrandingForm
        initial={{
          logo_url: company?.logo_url ?? "",
          brand_primary: company?.brand_primary ?? "",
          brand_accent: company?.brand_accent ?? "",
        }}
      />
    </div>
  );
}
