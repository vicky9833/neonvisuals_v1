import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Invite token helpers (server-only).
 *
 * Security model: the raw token is high-entropy and goes ONLY into the invite
 * link/email. The DB stores ONLY its SHA-256 hash (invites.token_hash). The
 * accept_invite() SECURITY DEFINER RPC recomputes the same SHA-256 hex in
 * Postgres (encode(extensions.digest(raw,'sha256'),'hex')) and matches it — so
 * the hashing here MUST stay byte-identical to that (sha256, hex, UTF-8 input).
 */

/** Days a pending invite remains valid. */
export const INVITE_TTL_DAYS = 7;

/** High-entropy URL-safe raw token (32 bytes → 43-char base64url). */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex of the raw token — matches the DB `digest(raw,'sha256')` hex. */
export function hashInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/** expires_at ISO string, INVITE_TTL_DAYS from now. */
export function inviteExpiryISO(from: Date = new Date()): string {
  return new Date(from.getTime() + INVITE_TTL_DAYS * 86_400_000).toISOString();
}

/** Absolute accept link carrying the RAW token (never the hash). */
export function inviteAcceptUrl(rawToken: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://neonvisuals.in";
  const url = new URL("/invite/accept", base);
  url.searchParams.set("token", rawToken);
  return url.toString();
}
