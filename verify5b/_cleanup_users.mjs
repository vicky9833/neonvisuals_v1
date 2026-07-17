import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 300 });
const t = (data?.users ?? []).filter((u) => u.email?.startsWith("t5b_"));
for (const u of t) await admin.auth.admin.deleteUser(u.id);
const { data: after } = await admin.auth.admin.listUsers({ page: 1, perPage: 300 });
console.log("deleted", t.length, "| remaining t5b_ users:", (after?.users ?? []).filter((u) => u.email?.startsWith("t5b_")).length);
