// lib/backend.ts
//
// Pemanggil backend Flask dari SISI SERVER (route handler dan server action). Jangan diimpor
// dari Client Component: file ini membaca BACKEND_URL dan menangani token mentah.

import type { z } from "zod";
import {
  ApiErrorEnvelopeSchema,
  dataEnvelope,
  type LoginInput,
  type LoginResponse,
  LoginResponseSchema,
  RefreshResponseSchema,
  type RegisterPetaniInput,
  type RegisterResponse,
  RegisterResponseSchema,
} from "./schemas";

/** Batas waktu menunggu backend. Fungsi server Vercel punya batas durasi sendiri. */
export const BACKEND_TIMEOUT_MS = 20_000;

const JSON_HEADERS = { Accept: "application/json", "Content-Type": "application/json" };

export class BackendConfigError extends Error {
  constructor() {
    super("BACKEND_URL belum diisi");
    this.name = "BackendConfigError";
  }
}

export function backendBaseUrl(): string {
  const url = process.env.BACKEND_URL;
  if (!url) throw new BackendConfigError();
  return url.replace(/\/+$/, "");
}

export function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${backendBaseUrl()}/api/v1${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
  });
}

export interface GalatBackend {
  status: number;
  code: string;
  message: string;
}

/** Ubah kegagalan fetch (timeout, jaringan putus, konfigurasi kosong) menjadi galat yang seragam. */
export function galatBackend(e: unknown): GalatBackend {
  if (e instanceof BackendConfigError) {
    return { status: 500, code: "SERVER_ERROR", message: "Konfigurasi server belum lengkap." };
  }
  if (e instanceof Error && e.name === "TimeoutError") {
    return {
      status: 504,
      code: "JARINGAN_GAGAL",
      message: "Server tidak merespons. Coba lagi nanti.",
    };
  }
  return {
    status: 502,
    code: "JARINGAN_GAGAL",
    message: "Tidak dapat terhubung ke server. Coba lagi nanti.",
  };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await backendFetch("/auth/refresh", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const parsed = dataEnvelope(RefreshResponseSchema).safeParse(
      await res.json().catch(() => null),
    );
    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------- */
/* Endpoint publik (tanpa token): login dan register                    */
/* -------------------------------------------------------------------- */

export type HasilPanggilan<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; message: string; details: Record<string, unknown> };

async function postPublik<S extends z.ZodType>(
  path: string,
  body: unknown,
  schema: S,
): Promise<HasilPanggilan<z.infer<S>>> {
  let res: Response;
  try {
    res = await backendFetch(path, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, details: {}, ...galatBackend(e) };
  }

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const galat = ApiErrorEnvelopeSchema.safeParse(json);
    if (galat.success) {
      const { code, message, details } = galat.data.error;
      return { ok: false, status: res.status, code, message, details: details ?? {} };
    }
    return {
      ok: false,
      status: res.status,
      code: "SERVER_ERROR",
      message: "Terjadi kesalahan pada server. Coba lagi nanti.",
      details: {},
    };
  }

  const parsed = dataEnvelope(schema).safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      status: 502,
      code: "RESPON_TIDAK_VALID",
      message: "Respons server tidak sesuai kontrak API.",
      details: {},
    };
  }
  return { ok: true, data: (parsed.data as { data: z.infer<S> }).data };
}

export type LoginHasil = HasilPanggilan<LoginResponse>;

/** Dipakai server action login. Token TIDAK pernah dikirim ke browser; simpan lewat setTokenCookies. */
export function loginBackend(input: LoginInput): Promise<LoginHasil> {
  return postPublik("/auth/login", input, LoginResponseSchema);
}

/** POST /auth/register (petani). Responsnya tidak berisi token, jadi lanjutkan dengan loginBackend. */
export function registerBackend(
  input: RegisterPetaniInput,
): Promise<HasilPanggilan<RegisterResponse>> {
  return postPublik("/auth/register", input, RegisterResponseSchema);
}

/** Pesan galat yang ramah untuk ditampilkan di form (bahasa Indonesia, tanpa detail teknis). */
export function pesanGalatPengguna(g: {
  code: string;
  message: string;
  details: Record<string, unknown>;
}): string {
  if (g.code === "VALIDASI_GAGAL") {
    for (const v of Object.values(g.details)) {
      const pesan = typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
      if (typeof pesan === "string" && pesan.length > 0) return pesan;
    }
  }
  if (g.code === "AKUN_TERKUNCI") {
    const sisa = g.details.sisa_menit;
    if (typeof sisa === "number" && !g.message.includes("menit")) {
      return `${g.message} Coba lagi dalam ${sisa} menit.`;
    }
  }
  return g.message;
}
