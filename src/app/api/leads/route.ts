import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";
import {
  createLead,
  listLeads,
  type LeadPriority,
  type LeadSource,
  type LeadStatus,
} from "@/lib/engines/lead";

export const runtime = "nodejs";

const createSchema = z.object({
  contactName: z.string().min(1),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  contactDesignation: z.string().optional(),
  companyName: z.string().min(1),
  companyIndustry: z.string().optional(),
  companySize: z.string().optional(),
  companyCity: z.string().optional(),
  companyWebsite: z.string().optional(),
  status: z
    .enum([
      "new",
      "contacted",
      "qualified",
      "proposal_sent",
      "negotiation",
      "won",
      "lost",
      "dormant",
    ])
    .optional(),
  priority: z.enum(["hot", "warm", "medium", "cold"]).optional(),
  source: z
    .enum([
      "whatsapp",
      "website",
      "gift_builder",
      "linkedin",
      "referral",
      "event",
      "cold_outreach",
      "google",
      "instagram",
      "other",
    ])
    .optional(),
  sourceDetail: z.string().optional(),
  estimatedOrderValue: z.number().nonnegative().optional(),
  estimatedKitCount: z.number().int().nonnegative().optional(),
  interestedCollections: z.array(z.string()).optional(),
  interestedOccasions: z.array(z.string()).optional(),
  assignedTo: z.string().uuid().optional(),
  nextFollowUpDate: z.string().optional(),
  nextFollowUpNote: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requirePlatform("platform.leads.manage", { entity: "lead", action: "lead.create" });
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid request body." },
        { status: 400 },
      );
    }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const lead = await createLead({
      ...parsed.data,
      contactEmail:
        parsed.data.contactEmail === "" ? undefined : parsed.data.contactEmail,
    });
    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[leads]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not create the lead. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    await requirePlatform("platform.leads.manage", { entity: "lead", action: "lead.list" });
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const result = await listLeads({
      status: statusParam
        ? (statusParam.includes(",")
            ? (statusParam.split(",") as LeadStatus[])
            : (statusParam as LeadStatus))
        : undefined,
      priority: (searchParams.get("priority") as LeadPriority) ?? undefined,
      source: (searchParams.get("source") as LeadSource) ?? undefined,
      assignedTo: searchParams.get("assignedTo") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      tags: searchParams.get("tags")
        ? searchParams.get("tags")!.split(",")
        : undefined,
      hasFollowUpBefore: searchParams.get("hasFollowUpBefore") ?? undefined,
      sortBy: (searchParams.get("sortBy") as never) ?? undefined,
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize")
        ? Number(searchParams.get("pageSize"))
        : undefined,
    });
    return NextResponse.json({ data: result });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[leads]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not load leads. Please try again." },
      { status: 500 },
    );
  }
}
