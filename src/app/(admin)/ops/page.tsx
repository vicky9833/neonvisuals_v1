import type { Metadata } from "next";
import { getProfile } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { getAdminOverview } from "@/lib/admin/overview";
import { listLeads } from "@/lib/engines/lead";
import { sendLeadFollowUpEmail, wasEmailSentRecently } from "@/lib/services/email";
import { ErrorBoundary } from "@/components/shared/error-boundary";

export const metadata: Metadata = { title: "Command Center" };

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const profile = await getProfile();
  const firstName = (profile?.full_name ?? "there").split(/\s+/)[0];
  const data = await getAdminOverview();

  // Daily lead follow-up digest to the admin (throttled via email_log).
  if (data.pipeline.overdueFollowUps > 0 && profile?.email) {
    const adminEmail = profile.email;
    // Awaited (serverless-safe): fire-and-forget is dropped on Vercel. Guarded
    // by wasEmailSentRecently (24h); wrapped so it can't break the page render.
    await (async () => {
      if (await wasEmailSentRecently(adminEmail, "lead_followup", 24)) return;
      const todayISO = new Date().toISOString().slice(0, 10);
      const { leads } = await listLeads({
        hasFollowUpBefore: todayISO,
        status: ["new", "contacted", "qualified", "proposal_sent", "negotiation"],
        pageSize: 50,
      });
      if (leads.length === 0) return;
      await sendLeadFollowUpEmail({
        to: adminEmail,
        leads: leads.map((l) => ({
          companyName: l.company_name,
          contactName: l.contact_name,
          followUpDate: l.next_follow_up_date ?? "",
          notes: l.next_follow_up_note ?? "",
        })),
      });
    })().catch((err) => console.error("[Email] Lead follow-up failed:", err));
  }

  const updatedAt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <PageHeader
          title="Command Center"
          description={`Welcome back, ${firstName}. Last updated ${updatedAt}.`}
        />
        <AdminOverview data={data} />
      </div>
    </ErrorBoundary>
  );
}
