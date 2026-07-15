import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { addProductImage, removeProductImage } from "@/lib/admin/products";

export const runtime = "nodejs";

// POST - upload a new image (multipart form-data with "file").
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sku: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { sku } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "invalid_input", message: "No file provided." },
        { status: 400 },
      );
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "invalid_input", message: "File must be an image." },
        { status: 400 },
      );
    }
    const bytes = await file.arrayBuffer();
    const product = await addProductImage(sku, file.name, bytes, file.type);
    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[admin/products/[sku]/images]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not upload the image. Please try again." },
      { status: 500 },
    );
  }
}

const deleteSchema = z.object({ url: z.string().min(1) });

// DELETE - remove an image (JSON body { url }).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sku: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { sku } = await params;
    const body = await request.json().catch(() => null);
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const product = await removeProductImage(sku, parsed.data.url);
    return NextResponse.json({ data: product });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[admin/products/[sku]/images]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not delete the image. Please try again." },
      { status: 500 },
    );
  }
}
