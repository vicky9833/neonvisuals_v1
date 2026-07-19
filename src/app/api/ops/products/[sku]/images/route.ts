import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";
import { scanUploadOrThrow, UploadScanError } from "@/lib/employees/upload-scan";
import { sniffImageMime, PROOF_EXT } from "@/lib/services/image-validate";
import { addProductImage, removeProductImage } from "@/lib/admin/products";

export const runtime = "nodejs";

// POST - upload a new image (multipart form-data with "file").
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sku: string }> },
) {
  try {
    await requirePlatform("platform.products.manage", { entity: "product", action: "product.image.add" });
    const { sku } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "invalid_input", message: "No file provided." },
        { status: 400 },
      );
    }
    const bytes = await file.arrayBuffer();
    // SECURITY: validate by MAGIC BYTES (not the client-supplied Content-Type). A renamed
    // non-image (evil.exe → photo.png) fails here because its bytes are not a valid image signature.
    const mime = sniffImageMime(bytes);
    if (!mime) {
      return NextResponse.json(
        { error: "invalid_image", message: "File is not a valid JPEG/PNG/WebP image." },
        { status: 422 },
      );
    }
    // Scan-seam on the live persist path (fail-closed; rejects when no scanner is configured).
    await scanUploadOrThrow(bytes, file.name);
    const product = await addProductImage(sku, `${sku}.${PROOF_EXT[mime]}`, bytes, mime);
    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof UploadScanError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
    }
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
    await requirePlatform("platform.products.manage", { entity: "product", action: "product.image.remove" });
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
