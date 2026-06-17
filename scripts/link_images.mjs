// Applies the uploaded-image manifest to the products table:
//   image_url      = primary image URL
//   gallery_images = remaining image URLs
// Run ONLY AFTER migrations 003/004/005 + the gallery_images column are applied
// to the remote DB (so the rows + columns exist). Uses the service key (bypasses RLS).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0 && !line.trimStart().startsWith("#")) env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
  return env;
}
const env = loadEnv(".env.local");
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const manifest = JSON.parse(readFileSync("scripts/_image_manifest.json", "utf8"));

let ok = 0, missing = 0, failed = 0;
for (const [sku, m] of Object.entries(manifest)) {
  if (!m.primary) continue;
  const { data, error } = await supa
    .from("products")
    .update({ image_url: m.primary, gallery_images: m.gallery })
    .eq("sku", sku)
    .select("sku");
  if (error) { console.log("FAIL", sku, error.message); failed += 1; }
  else if (!data || data.length === 0) { console.log("NO ROW", sku); missing += 1; }
  else { ok += 1; }
}
console.log(`\nLinked: ${ok}. Rows missing (SKU not in DB yet): ${missing}. Failed: ${failed}.`);
