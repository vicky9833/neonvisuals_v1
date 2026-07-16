import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReminders, getUpcomingEvents } from "@/lib/engines/occasions";
import { generateOccasions } from "@/lib/engines/occasion-generator";
import { resolveCompanyRecipients } from "@/lib/services/recipients";
import {
  opsAlertRecipients,
  sendOccasionReminderEmail,
  sendOpsDailyDigestEmail,
  wasEmailSentRecently,
} from "@/lib/services/email";

export const runtime = "nodejs";

const DIGEST_RANGE_DAYS = 45;
const DEDUPE_HOURS = 20; // < 24h so a same-day double-run never double-sends

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Daily cron (07:00 IST via vercel.json). PROTECTED by CRON_SECRET:
 * requires `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this
 * automatically when CRON_SECRET is set). 401 otherwise.
 *
 * For every company: (re)generate reminders, email occasion reminders due
 * today, and send ONE cross-company ops digest of the next 45 days.
 * Idempotent: wasEmailSentRecently() means running twice never double-sends.
 * Email-only — does NOT write the notifications table (that's Prompt 6).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supa = createAdminClient();
  const today = todayISO();

  let companiesProcessed = 0;
  let remindersSent = 0;
  let digestSent = false;

  try {
    const { data: companies } = await supa
      .from("companies")
      .select("id, name");

    const digestCompanies: Array<{
      companyName: string;
      events: Array<{ title: string; date: string; type: string }>;
    }> = [];

    for (const c of companies ?? []) {
      const companyId = c.id as string;
      companiesProcessed += 1;

      // 1. (Re)generate occasion instances, THEN derive reminders from them (Prompt 5b:
      // reminders is a downstream consumer of occasions; no on-the-fly recompute).
      try {
        await generateOccasions(companyId, supa);
        await generateReminders(companyId, supa);
      } catch (err) {
        console.error(`[CRON] occasion/reminder gen failed for ${companyId}:`, err);
      }

      // 2. Email occasion reminders whose reminder_date is today.
      const { data: due } = await supa
        .from("reminders")
        .select("title, occasion_date, reminder_type")
        .eq("company_id", companyId)
        .eq("reminder_date", today)
        .eq("is_dismissed", false);

      if (due && due.length > 0) {
        const { clientName, emails } = await resolveCompanyRecipients(companyId);
        const occasions = due.map((r) => ({
          title: r.title as string,
          date: r.occasion_date as string,
          type: (r.reminder_type as string) ?? "occasion",
        }));
        for (const to of emails) {
          if (await wasEmailSentRecently(to, "occasion_reminder", DEDUPE_HOURS)) {
            continue;
          }
          const res = await sendOccasionReminderEmail({ to, clientName, occasions });
          if (res.success) remindersSent += 1;
        }
      }

      // 3. Collect upcoming occasions for the ops digest.
      try {
        const events = await getUpcomingEvents(companyId, DIGEST_RANGE_DAYS, supa);
        if (events.length > 0) {
          digestCompanies.push({
            companyName: (c.name as string) ?? "Company",
            events: events.map((e) => ({
              title: e.title,
              date: e.date,
              type: e.type,
            })),
          });
        }
      } catch (err) {
        console.error(`[CRON] digest events failed for ${companyId}:`, err);
      }
    }

    // 4. ONE ops digest across all companies (idempotent per day).
    // Dedupe key MUST match how logEmail stores to_email for a multi-recipient
    // send: the recipients joined with ", " (not just the first address).
    const opsList = opsAlertRecipients();
    const opsKey = opsList.join(", ");
    const digestAlreadySent = opsList.length
      ? await wasEmailSentRecently(opsKey, "ops_daily_digest", DEDUPE_HOURS)
      : false;
    if (!digestAlreadySent) {
      const res = await sendOpsDailyDigestEmail({
        rangeDays: DIGEST_RANGE_DAYS,
        companies: digestCompanies,
      });
      digestSent = res.success;
    }

    return NextResponse.json({
      data: {
        companies_processed: companiesProcessed,
        reminders_sent: remindersSent,
        digest_sent: digestSent,
      },
    });
  } catch (err) {
    console.error("[CRON] reminders cron failed:", err);
    return NextResponse.json(
      { error: "cron_failed", message: "Reminder cron failed." },
      { status: 500 },
    );
  }
}
