import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmailTestPanel } from "@/components/admin/EmailTestPanel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured } from "@/lib/services/email";
import { formatDateFull } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Emails" };

export const dynamic = "force-dynamic";

interface EmailLogRow {
  id: string;
  to_email: string;
  subject: string;
  template: string;
  status: string;
  resend_id: string | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  sent: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  bounced: "bg-amber-50 text-amber-700",
};

export default async function AdminEmailsPage() {
  const supa = createAdminClient();
  const { data } = await supa
    .from("email_log")
    .select("id, to_email, subject, template, status, resend_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as EmailLogRow[];

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const total = rows.length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const thisWeek = rows.filter((r) => r.created_at >= weekAgo).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Email Log"
        description="Transactional emails sent by the platform."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total (last 200)" value={total} />
        <StatCard label="Failed" value={failed} />
        <StatCard label="This Week" value={thisWeek} />
      </div>

      <EmailTestPanel configured={isEmailConfigured()} />

      <div className="overflow-x-auto rounded-card border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No emails sent yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm text-[#9CA3AF]">
                    {formatDateFull(r.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-navy">{r.to_email}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-sm text-[#6B7280]">
                    {r.subject}
                  </TableCell>
                  <TableCell className="text-sm text-[#6B7280]">{r.template}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {r.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
