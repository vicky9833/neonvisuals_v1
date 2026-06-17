import { NextResponse } from "next/server";
import { PRODUCTS } from "@/data/products";

/** Returns the product catalogue. */
export async function GET() {
  return NextResponse.json({ data: PRODUCTS });
}
