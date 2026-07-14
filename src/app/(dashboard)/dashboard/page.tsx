import type { Metadata } from "next";
import {
  Calendar,
  CalendarPlus,
  FileText,
  Gift,
  Package,
  Palette,
  Receipt,
  UserPlus,
  Users,
} from "lucide-react";
import { getProfile } from "@/lib/auth";
import {
  getActiveQuotesCount,
  getActiveOrdersCount,
  getEmployeeCount,
  getGiftsSentCount,
  getOutstandingAmount,
  getRecentActivity,
  type OccasionItem,
} from "@/lib/dashboard/queries";
import {
  generateReminders,
  getEventsForMonth,
  getUpcomingEvents,
} from "@/lib/engines/occasions";
import {
  sendOccasionReminderEmail,
  wasEmailSentRecently,
} from "@/lib/services/email";
import { SetPageTitle } from "@/components/dashboard/DashboardProvider";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { RemindersPanel } from "@/components/occasions/RemindersPanel";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CalendarPreview } from "@/components/dashboard/CalendarPreview";
import { ErrorBoundary } from "@/components/shared/error-boundary";

export const metadata: Metadata = { title: "Dashboard" };

/** IST-aware time fields for the greeting + calendar. */
function istNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
    month: "numeric",
    year: "numeric",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const hour = get("hour") % 24;
  return { hour, month: get("month") - 1, year: get("year") };
}

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardOverviewPage() {
  const profile = await getProfile();
  const companyId = profile?.company_id ?? "";
  const firstName = (profile?.full_name ?? "there").split(/\s+/)[0];
  const companyName = profile?.company?.name ?? "your company";
  const { hour, month, year } = istNow();

  const [
    employeeCount,
    giftsSent,
    upcoming,
    activeQuotes,
    activeOrders,
    outstanding,
    recent,
    monthlyEvents,
  ] = await Promise.all([
    getEmployeeCount(companyId),
    getGiftsSentCount(companyId),
    getUpcomingEvents(companyId, 30),
    getActiveQuotesCount(companyId),
    getActiveOrdersCount(companyId),
    getOutstandingAmount(companyId),
    getRecentActivity(companyId, 8),
    getEventsForMonth(companyId, month, year),
  ]);

  // Generate reminders on dashboard load (idempotent + debounced once/day).
  if (companyId) {
    try {
      await generateReminders(companyId);
    } catch {
      // non-blocking
    }
  }

  // Weekly occasion-reminder email (throttled via email_log).
  const contactEmail = profile?.company?.primary_contact_email ?? null;
  const within7 = upcoming.filter((e) => {
    const days = (new Date(e.date).getTime() - Date.now()) / 86_400_000;
    return days >= 0 && days <= 7;
  });
  if (contactEmail && within7.length > 0) {
    // Awaited (serverless-safe): fire-and-forget is dropped on Vercel. Guarded
    // by wasEmailSentRecently so it sends at most once/week; wrapped so it
    // can't break the dashboard render.
    await (async () => {
      if (await wasEmailSentRecently(contactEmail, "occasion_reminder", 168)) return;
      await sendOccasionReminderEmail({
        to: contactEmail,
        clientName: firstName,
        occasions: within7.map((e) => ({
          title: e.title,
          date: e.date,
          type: e.type,
          employeeName: e.employeeName ?? undefined,
        })),
      });
    })().catch((err) => console.error("[Email] Occasion reminder failed:", err));
  }

  const monthlyOccasions: OccasionItem[] = monthlyEvents.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    occasion_type: e.type,
    employee_name: e.employeeName ?? null,
  }));

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <SetPageTitle title="Overview" />

      {/* Welcome */}
      <header>
        <h1 className="font-heading text-2xl font-bold text-navy">
          {greeting(hour)}, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Here&apos;s what&apos;s happening with your team&apos;s gifting at{" "}
          {companyName}.
        </p>
      </header>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <MetricCard
          label="Team Members"
          value={employeeCount}
          icon={Users}
          subtitle="Registered employees"
          accent="navy"
          emptyHref="/dashboard/employees"
          emptyLabel="Add your team"
        />
        <MetricCard
          label="Gifts Sent"
          value={giftsSent}
          icon={Gift}
          subtitle="All time"
          accent="gold"
          emptyHref="/gift-builder"
          emptyLabel="Send your first gift"
        />
        <MetricCard
          label="Upcoming Occasions"
          value={upcoming.length}
          icon={Calendar}
          subtitle="Next 30 days"
          accent="navy"
          emptyHref="/dashboard/occasions"
          emptyLabel="Set up occasions"
        />
        <MetricCard
          label="Active Orders"
          value={activeOrders}
          icon={Package}
          subtitle="In production or transit"
          accent="navy"
          emptyHref="/dashboard/orders"
          emptyLabel="View orders"
        />
        <MetricCard
          label="Active Quotes"
          value={activeQuotes}
          icon={FileText}
          subtitle="Pending quotes"
          accent="gold"
          emptyHref="/get-quote"
          emptyLabel="Request a quote"
        />
        {outstanding > 0 && (
          <MetricCard
            label="Outstanding (₹)"
            value={Math.round(outstanding)}
            icon={Receipt}
            subtitle="Across unpaid invoices"
            accent="gold"
            emptyHref="/dashboard/billing"
            emptyLabel="View billing"
          />
        )}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <QuickActionCard
          title="Curate an Experience Kit"
          description="Select products, choose packaging, and request a custom quote for your team."
          href="/gift-builder"
          buttonLabel="Start Building"
          icon={Palette}
          tint="gold"
        />
        <QuickActionCard
          title="Add Team Members"
          description="Upload your employee list to unlock personalised gifting and occasion tracking."
          href="/dashboard/employees"
          buttonLabel="Add Employees"
          icon={UserPlus}
          tint="navy"
        />
        <QuickActionCard
          title="Set Up Occasions"
          description="Configure your gifting calendar - birthdays, anniversaries, festivals, and more."
          href="/dashboard/occasions"
          buttonLabel="View Calendar"
          icon={CalendarPlus}
          tint="cream"
        />
      </div>

      {/* Occasions + activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
            <h2 className="font-heading mb-4 text-base font-semibold text-navy">
              Upcoming Occasions
            </h2>
            <RemindersPanel variant="panel" limit={5} />
          </section>
        </div>
        <div className="lg:col-span-2">
          <RecentActivity items={recent} />
        </div>
      </div>

      {/* Calendar */}
      <CalendarPreview occasions={monthlyOccasions} month={month} year={year} />
      </div>
    </ErrorBoundary>
  );
}
