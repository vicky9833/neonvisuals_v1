// Preload process.env from .env.local BEFORE any app module (email/Resend) initializes.
import { readFileSync } from "node:fs";
for (const line of readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  const k = line.slice(0, i).trim();
  const v = line.slice(i + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}
export {};
