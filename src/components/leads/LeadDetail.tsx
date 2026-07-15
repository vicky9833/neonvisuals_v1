"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatDateFull } from "@/lib/utils/format";
import { BUCKETS } from "@/data/buckets";
import type {
  ActivityInput,
  CompanyInput,
  Lead,
  LeadStatus,
} from "@/lib/engines/lead";
import { PIPELINE_STAGES } from "@/lib/engines/lead-constants";
import { PriorityDot } from "./LeadStatusBadge";
import { LeadScoreIndicator } from "./LeadScoreIndicator";
import { LeadActivityForm } from "./LeadActivityForm";
import { LeadActivityTimeline } from "./LeadActivityTimeline";
import { LeadForm } from "./LeadForm";
import { LeadConvertDialog } from "./LeadConvertDialog";
import { LeadLossDialog } from "./LeadLossDialog";
import { SOURCE_LABEL, STATUS_META, LEAD_OCCASIONS } from "./lead-meta";

interface LeadDetailProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

const ALL_STATUSES: LeadStatus[] = [
  ...PIPELINE_STAGES.map((s) => s.status),
  "dormant",
];

function collectionName(code: string): string {
  return BUCKETS.find((b) => b.code === code)?.name ?? code;
}

function occasionLabel(value: string): string {
  return LEAD_OCCASIONS.find((o) => o.value === value)?.label ?? value;
}

export function LeadDetail({
  leadId,
  open,
  onOpenChange,
  onChanged,
}: LeadDetailProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showLoss, setShowLoss] = useState(false);

  const reload = useCallback(async () => {
    if (!leadId) return;
    const res = await fetch(`/api/leads/${leadId}`);
    if (res.ok) {
      const body = await res.json();
      setLead(body.data as Lead);
    }
  }, [leadId]);

  useEffect(() => {
    if (!open || !leadId) return;
    setLead(null);
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [open, leadId, reload]);

  async function changeStatus(status: LeadStatus) {
    if (!lead) return;
    if (status === lead.status) return;
    if (status === "won") return setShowConvert(true);
    if (status === "lost") return setShowLoss(true);
    await fetch(`/api/leads/${lead.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await reload();
    onChanged();
  }

  async function confirmLoss(reason: string, notes?: string) {
    if (!lead) return;
    await fetch(`/api/leads/${lead.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "lost", lossReason: reason, notes }),
    });
    await reload();
    onChanged();
  }

  async function confirmConvert(data: CompanyInput) {
    if (!lead) return;
    await fetch(`/api/leads/${lead.id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await reload();
    onChanged();
  }

  async function logActivity(activity: ActivityInput) {
    if (!lead) return;
    await fetch(`/api/leads/${lead.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activity),
    });
    await reload();
    onChanged();
  }

  const statusActivities =
    lead?.activities?.filter((a) => a.activity_type === "status_change") ?? [];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {loading || !lead ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <>
              <SheetHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <PriorityDot priority={lead.priority} withLabel />
                  <button
                    type="button"
                    onClick={() => setShowEdit(true)}
                    className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
                  >
                    <Pencil className="size-3.5" /> Edit
                  </button>
                </div>
                <SheetTitle className="font-heading text-xl text-navy">
                  {lead.company_name}
                </SheetTitle>
                <SheetDescription>
                  {lead.contact_name}
                  {lead.contact_designation ? ` · ${lead.contact_designation}` : ""}
                </SheetDescription>
                <div className="flex items-center gap-3 pt-1">
                  <Select value={lead.status} onValueChange={(v) => changeStatus(v as LeadStatus)}>
                    <SelectTrigger className="h-8 w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_META[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <LeadScoreIndicator score={lead.lead_score} size="md" />
                </div>
              </SheetHeader>

              <Tabs defaultValue="activity" className="mt-4 px-1">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="links">Quotes</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                {/* Overview */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <Card title="Contact">
                    <Field label="Email" value={lead.contact_email} />
                    <Field label="Phone" value={lead.contact_phone} />
                    <Field label="Designation" value={lead.contact_designation} />
                  </Card>
                  <Card title="Company">
                    <Field label="Industry" value={lead.company_industry} />
                    <Field label="Size" value={lead.company_size} />
                    <Field label="City" value={lead.company_city} />
                    <Field label="Website" value={lead.company_website} />
                  </Card>
                  <Card title="Opportunity">
                    <Field
                      label="Estimated value"
                      value={
                        lead.estimated_order_value
                          ? formatCurrency(Number(lead.estimated_order_value))
                          : null
                      }
                    />
                    <Field
                      label="Kit count"
                      value={lead.estimated_kit_count?.toString() ?? null}
                    />
                    <Field
                      label="Collections"
                      value={
                        lead.interested_collections?.length
                          ? lead.interested_collections.map(collectionName).join(", ")
                          : null
                      }
                    />
                    <Field
                      label="Occasions"
                      value={
                        lead.interested_occasions?.length
                          ? lead.interested_occasions.map(occasionLabel).join(", ")
                          : null
                      }
                    />
                  </Card>
                  <Card title="Follow-up">
                    <Field
                      label="Next follow-up"
                      value={
                        lead.next_follow_up_date
                          ? formatDate(lead.next_follow_up_date)
                          : null
                      }
                    />
                    <Field label="Note" value={lead.next_follow_up_note} />
                  </Card>
                  {lead.tags && lead.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lead.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-navy"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {lead.notes && (
                    <Card title="Notes">
                      <p className="text-sm text-[#2D2D2D]">{lead.notes}</p>
                    </Card>
                  )}
                </TabsContent>

                {/* Activity */}
                <TabsContent value="activity" className="mt-4 space-y-4">
                  <LeadActivityForm onSubmit={logActivity} />
                  <LeadActivityTimeline activities={lead.activities ?? []} />
                </TabsContent>

                {/* Quotes & Orders */}
                <TabsContent value="links" className="mt-4 space-y-4">
                  <Card title="Linked Quote">
                    {lead.first_quote_id ? (
                      <Link
                        href={`/admin/quotes`}
                        className="inline-flex items-center gap-1 text-sm text-gold hover:underline"
                      >
                        View quote <ExternalLink className="size-3.5" />
                      </Link>
                    ) : (
                      <p className="text-sm text-[#9CA3AF]">No quote linked yet.</p>
                    )}
                  </Card>
                  <Card title="Linked Order">
                    {lead.first_order_id ? (
                      <Link
                        href={`/admin/orders/${lead.first_order_id}`}
                        className="inline-flex items-center gap-1 text-sm text-gold hover:underline"
                      >
                        View order <ExternalLink className="size-3.5" />
                      </Link>
                    ) : (
                      <p className="text-sm text-[#9CA3AF]">No order placed yet.</p>
                    )}
                  </Card>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/admin/quotes">Create Quote for This Lead</Link>
                  </Button>
                  {lead.company_id && (
                    <p className="text-xs text-green-700">
                      ✓ Converted to a client company.
                    </p>
                  )}
                </TabsContent>

                {/* History */}
                <TabsContent value="history" className="mt-4 space-y-4">
                  <Card title="Origin">
                    <Field label="Source" value={SOURCE_LABEL[lead.source]} />
                    <Field label="Source detail" value={lead.source_detail} />
                    <Field label="Created" value={formatDateFull(lead.created_at)} />
                  </Card>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-navy">
                      Status Changes
                    </h3>
                    {statusActivities.length === 0 ? (
                      <p className="text-sm text-[#9CA3AF]">No status changes yet.</p>
                    ) : (
                      <ol className="space-y-3">
                        {statusActivities.map((a) => (
                          <li key={a.id} className="flex gap-3">
                            <span className="mt-1.5 size-2 rounded-full bg-navy" />
                            <div>
                              <p className="text-sm font-medium text-navy">
                                {a.title}
                              </p>
                              <p className="text-xs text-[#9CA3AF]">
                                {formatDateFull(a.performed_at)}
                              </p>
                              {a.description && (
                                <p className="text-sm text-[#6B7280]">
                                  {a.description}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {lead && (
        <>
          <LeadForm
            open={showEdit}
            onOpenChange={setShowEdit}
            lead={lead}
            onSaved={() => {
              reload();
              onChanged();
            }}
          />
          <LeadConvertDialog
            lead={lead}
            open={showConvert}
            onOpenChange={setShowConvert}
            onConfirm={confirmConvert}
          />
          <LeadLossDialog
            open={showLoss}
            onOpenChange={setShowLoss}
            onConfirm={confirmLoss}
          />
        </>
      )}
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-navy">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-[#9CA3AF]">{label}</span>
      <span className="text-right text-navy">{value || "-"}</span>
    </div>
  );
}
