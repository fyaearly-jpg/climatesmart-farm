// lib/session-core.ts
//
// Sesi bertanda-tangan (HMAC-SHA256). Sebelumnya role disimpan sebagai cookie
// teks biasa ("csf_role=admin") sehingga siapa pun bisa memalsukannya lewat
// DevTools/curl. Sekarang isi sesi (role, nama, kedaluwarsa) ditandatangani
// dengan SESSION_SECRET yang hanya ada di server — token yang diubah akan
// gagal diverifikasi.
//
// Berkas ini SENGAJA tanpa `server-only` dan tanpa `next/headers` supaya bisa
// dipakai oleh proxy.ts maupun diuji sebagai fungsi murni (unit test).
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { type Role, RoleEnum } from "./schemas";

export const SESSION_COOKIE = "csf_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const SessionPayloadSchema = z.object({
  role: RoleEnum,
  name: z.string(),
  exp: z.number(),
});
export type Session = { role: Role; name: string; exp: number };

// Hanya dipakai saat development lokal (NODE_ENV !== "production") agar
// `npm run dev` tetap jalan tanpa setup. Di production, SESSION_SECRET wajib.
const DEV_FALLBACK_KEY = "csf-local-development-only-key";

function getKey(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET belum diatur (minimal 32 karakter). Atur di Vercel: Settings > Environment Variables.",
    );
  }
  return DEV_FALLBACK_KEY;
}

function sign(payload: string): string {
  return createHmac("sha256", getKey()).update(payload).digest("base64url");
}

export function createSessionToken(role: Role, name: string, now: number = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ role, name, exp: now + SESSION_MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(
  token: string | undefined,
  now: number = Date.now(),
): Session | null {
  if (!token) return null;
  const parts = token.split(".");
  const [payload, signature] = parts;
  if (parts.length !== 2 || !payload || !signature) return null;

  const given = Buffer.from(signature);
  const expected = Buffer.from(sign(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const parsed = SessionPayloadSchema.safeParse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    if (!parsed.success || parsed.data.exp <= now) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
