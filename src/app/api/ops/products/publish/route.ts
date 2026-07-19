import { NextResponse } from "next/server";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPendingChanges, publishCatalog } from "@/lib/admin/catalog-publish";

export const runtime = "nodejs";

/**
 * GET — the "N pending changes" status. Readable by any product admin
 * (platform.products.manage). Does not mutate anything.
 */
export async function GET() {
  try {
    await requirePlatform("platform.products.manage", { entity: "catalog", action: "catalog.pending" });
    const pending = await getPendingChanges(createAdminClient());
    return NextResponse.json({ data: pending });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[admin/products/publish GET]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to read publish status." },
      { status: 500 },
    );
  }
}

/**
 * POST — publish the catalog. Gated by platform.catalog.publish (owner/admin ONLY, AUDITED — the
 * requirePlatform guard writes the audit row because the capability is in AUDITED_PLATFORM_CAPS).
 * Regenerates from the DB, stores the output for a manual commit+deploy, and advances the baseline.
 * NEVER commits/pushes/deploys.
 */
export async function POST() {
  try {
    await requirePlatform("platform.catalog.publish", { entity: "catalog", action: "catalog.publish" });
    const result = await publishCatalog(createAdminClient());
    return NextResponse.json({ data: result });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[admin/products/publish POST]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to publish catalog." },
      { status: 500 },
    );
  }
}
