// Uploads cleanly-mapped product images to Supabase Storage (bucket: product-images).
// Storage-only: does NOT touch the DB. Writes a manifest of public URLs per SKU
// so the image_url / gallery_images DB linkage can be applied once the schema exists.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "product-images";
const BUCKET = "product-images";
const MAX_PER_SKU = 6;
const IMG_EXT = new Set([".webp", ".jpg", ".jpeg", ".avif", ".png"]);
const CT = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".avif": "image/avif", ".png": "image/png" };

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

// Recursively collect image files under a folder.
function collect(dir) {
  let out = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out = out.concat(collect(p));
    else if (IMG_EXT.has(extname(name).toLowerCase())) out.push(p);
  }
  return out;
}

// Clean, non-conflicting mapping: SKU -> [parent folders] (recursed).
const MAP = {
  "NV-A01": ["ONBOARDING/BOTTLE/COPPER BOTTLE"],
  "NV-A02": ["ONBOARDING/TUMBLER"],
  "NV-A03": ["ONBOARDING/DIARY"],
  "NV-A05": ["ONBOARDING/PEN"],
  "NV-A06": ["ONBOARDING/TOTE BAG"],
  "NV-A07": ["ONBOARDING/MOUSE PAD"],
  "NV-A09": ["ONBOARDING/HOODIE"],
  "NV-A10": ["ONBOARDING/T-SHIRT"],
  "NV-A12": ["ONBOARDING/LAPTOP STICKER"],
  "NV-A13": ["ONBOARDING/PHONE STAND"],
  "NV-A14": ["ONBOARDING/KEY CHAIN"],
  "NV-A15": ["ONBOARDING/SEED CARD"],
  "NV-A16": ["ONBOARDING/BOTTLE/SILVER BOTTLE"],
  "NV-A17": ["ONBOARDING/MUG"],
  "NV-I01": ["EVENTS/3D PRINTED PHOTO ALBUM"],
  "NV-I02": ["EVENTS/INSTANT FRIDGE MAGNET"],
  "NV-I03": ["EVENTS/3D PRINTED CALENDER", "FESTIVE/CHRISTMAS 3D PRINTED CALENDER OR NEVER EXPIRING CALENDER (INSTA INSPIRED)"],
  "NV-I04": ["EVENTS/MAGNETIC FLUID SPEAKER"],
  "NV-I05": ["EVENTS/COLLAPSIBLE SILICON BOTTLE", "EVENTS/COLLAPSIBLE SILICON CUP"],
  "NV-I06": ["EVENTS/WATER BOTTLE WITH PHONE STAND"],
  "NV-I07": ["EVENTS/FOLDABLE SILICON PHONE STAND"],
  "NV-I08": ["EVENTS/BOOK LAMP", "FESTIVE/BOOK LAMP (INSTA INSPIRED)"],
  "NV-I09": ["EVENTS/JELLY FISH LAMP"],
  "NV-I10": ["EVENTS/TRAVELLING DISPENSER"],
  "NV-I11": ["EVENTS/DESK ORGANISER KIT"],
  "NV-I12": ["EVENTS/T-SHIRT", "EVENTS/HOODIE"],
  "NV-I13": ["EVENTS/CAP"],
  "NV-J01": ["COLLEGE/T-SHIRT"],
  "NV-J02": ["COLLEGE/HOODIE"],
  "NV-J03": ["COLLEGE/CAP"],
  "NV-J04": ["COLLEGE/TOTE BAG"],
  "NV-J05": ["COLLEGE/FLEXIBLE PHONE STAND"],
  "NV-J07": ["COLLEGE/PEN", "COLLEGE/DIARY"],
  "NV-J08": ["COLLEGE/DIARY"],
  "NV-B01": ["MILESTONE/ONE YEAR/ACRYLIC TROPHY LED BASE"],
  "NV-B05": ["MILESTONE/FIVE YEAR/CRYSTAL AWARD WITH NAME AND DATE"],
  "NV-B07": ["MILESTONE/FIVE YEAR/WOOD PLUS BRASS OR MAGNETIC CLOCK (INSTA INSPIRED)"],
  "NV-B09": ["MILESTONE/FIVE YEAR/COPPER BAR SET"],
  "NV-B11": ["MILESTONE/TEN YEAR/BRASS TROPHY HERITAGE"],
  "NV-B12": ["MILESTONE/TEN YEAR/ACHIEVEMENT COIN DIE-CAST"],
  "NV-C01": ["LEADERSHIP/WAX-SEALED CEO LETTER+GIFT"],
  "NV-C02": ["LEADERSHIP/MARBLE TROPHY BRASS PLATE"],
  "NV-C03": ["LEADERSHIP/EXCEUTIVE PEN SET WOOD BOX"],
  "NV-C05": ["LEADERSHIP/COPPER VISKI SET+TRAY"],
  "NV-C06": ["LEADERSHIP/ACHIEVEMENT GOLD VELVET COIN"],
  "NV-C08": ["LEADERSHIP/LEATHER EMBOSSED PORTFOLIO"],
  "NV-C10": ["LEADERSHIP/CURATE BOX GIFT+NOTE"],
  "NV-C11": ["LEADERSHIP/CRYSTAL STAR TROPHY 3D LEASER"],
  "NV-C12": ["LEADERSHIP/BRASS DESK GLOBE NAME BASE"],
  "NV-D01": ["FESTIVE/DIWALI BRASS DIYA SET"],
  "NV-D02": ["FESTIVE/DIWALI SOY CANDLE FESTIVE TIN"],
  "NV-D06": ["FESTIVE/CHRISTMAS ACRYLIC ORNAMENT"],
  "NV-D08": ["FESTIVE/PONGAL BRASS THALI SET"],
  "NV-D12": ["FESTIVE/FESTIVE BLOCK PRINT TOTE"],
  "NV-E01": ["CLIENT/LEATHER PORTFOLIO DUAL LOGO"],
  "NV-E03": ["CLIENT/COPPER DECANTER SET 2 GLASS+"],
  "NV-E04": ["CLIENT/ARTISNAL TEA OR COFFE SET"],
  "NV-E06": ["CLIENT/PARTNERSHIP ANNIVERSARY CRYSTAL"],
  "NV-E11": ["CLIENT/BRASS PEN STAND ENGRAVED"],
  "NV-E12": ["CLIENT/HANDCRAFTED WOOD BOX PIETRA DURA"],
  "NV-H01": ["SUSTAINABILITY/PLANTABLE SEED PAPER NOTEBOOK"],
  "NV-H02": ["SUSTAINABILITY/ENGRAVED BAMBOO DESK ORGANISER"],
  "NV-H03": ["SUSTAINABILITY/PLANT KIT HERB GARDEN STARTER"],
  "NV-H05": ["SUSTAINABILITY/ORGANIC SOY CANDLE NAMED TIN"],
  "NV-H06": ["SUSTAINABILITY/RECYCLED FABRIC NAMED TOTE"],
  "NV-H07": ["SUSTAINABILITY/COMPOSTABLE PACKAGING SET"],
  "NV-H09": ["SUSTAINABILITY/ORGANIC COTTON TEE EMBROIDERED"],
  "NV-H10": ["SUSTAINABILITY/TERRACOTA PLANTER HAND-PAINTED"],
  "NV-H11": ["SUSTAINABILITY/BEESWAX WRAP SET 3 PCS"],
  "NV-H12": ["SUSTAINABILITY/BAMBBO CUTLERRY TRAVEL SET"],
};

async function ensureBucket() {
  const { data } = await supa.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await supa.storage.createBucket(BUCKET, { public: true });
    if (error && !/already exists/i.test(error.message)) throw error;
    console.log("Created bucket", BUCKET);
  } else console.log("Bucket exists", BUCKET);
}

const manifest = {};
let totalUploaded = 0;

await ensureBucket();

const skus = Object.keys(MAP);
for (const sku of skus) {
  let files = [];
  for (const folder of MAP[sku]) files = files.concat(collect(join(ROOT, folder)));
  // de-dup by basename, sort, cap
  const seen = new Set();
  files = files.filter((f) => { const b = f.split(/[\\/]/).pop(); if (seen.has(b)) return false; seen.add(b); return true; })
               .sort((a, b) => a.localeCompare(b))
               .slice(0, MAX_PER_SKU);
  const urls = [];
  let n = 0;
  for (const f of files) {
    n += 1;
    const ext = extname(f).toLowerCase();
    const dest = `${sku}/${sku}_${String(n).padStart(2, "0")}${ext}`;
    const body = readFileSync(f);
    const { error } = await supa.storage.from(BUCKET).upload(dest, body, { contentType: CT[ext], upsert: true });
    if (error) { console.log("FAIL", dest, error.message); continue; }
    const { data } = supa.storage.from(BUCKET).getPublicUrl(dest);
    urls.push(data.publicUrl);
    totalUploaded += 1;
  }
  manifest[sku] = { primary: urls[0] ?? null, gallery: urls.slice(1), count: urls.length };
  console.log(`${sku}: ${urls.length} uploaded`);
}

writeFileSync("scripts/_image_manifest.json", JSON.stringify(manifest, null, 2));
const withImages = Object.values(manifest).filter((m) => m.count > 0).length;
console.log(`\nDONE. SKUs with images: ${withImages}/${skus.length}. Total images uploaded: ${totalUploaded}.`);
