/**
 * Supabase Storage helpers. Bucket names and upload helpers are wired in a
 * dedicated task; these utilities are pure so they're safe to import
 * anywhere.
 */
export const STORAGE_BUCKETS = {
  products: "products",
  employees: "employees",
  invoices: "invoices",
  uploads: "uploads",
} as const;

export type StorageBucket = keyof typeof STORAGE_BUCKETS;

/** Builds a public object URL for a Supabase Storage path. */
export function publicStorageUrl(bucket: StorageBucket, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${STORAGE_BUCKETS[bucket]}/${path}`;
}
