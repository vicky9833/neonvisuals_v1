"use client";

import { PRODUCTS } from "@/data/products";

/** Provides the product catalogue to client components. */
export function useProducts() {
  return { products: PRODUCTS };
}
