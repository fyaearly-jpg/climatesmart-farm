// lib/api.ts
//
// API client sisi BROWSER untuk KONTRAK API v1.0.
// - Memanggil /api/v1 di origin yang sama. Route handler Next.js (app/api/v1/[...path]) yang
//   menyematkan `Authorization: Bearer` dari cookie httpOnly dan me-refresh token yang kedaluwarsa.
//   Karena itu file ini TIDAK menyimpan atau membaca token apa pun.
// - Semua error diubah menjadi ApiError dari amplop { error: { code, message, details } }.
// - Semua respons sukses divalidasi dengan skema Zod; data yang menyimpang dari kontrak
//   ditolak dengan kode RESPON_TIDAK_VALID, bukan dibiarkan lolos ke UI.
//
// Login dan logout dilakukan lewat server action (lihat lib/backend.ts dan lib/auth-cookies.ts).

import { z } from "zod";
import {
  type Aktivitas,
  AntreanValidasiItemSchema,
  ApiErrorEnvelopeSchema,
  BacaNotifikasiSchema,
  CuacaSchema,
  dataEnvelope,
  JadwalItemSchema,
  KoreksiHasilSchema,
  type KoreksiInput,
  LahanSchema,
  type MusimTanamInput,
  MusimTanamSchema,
  NotifikasiSchema,
  PrediksiSchema,
  pagedEnvelope,
  type SimulasiInput,
  SimulasiSchema,
  UserSchema,
} from "./schemas";

export const API_BASE = "/api/v1";
const HALAMAN_LOGIN = "/login";

/* -------------------------------------------------------------------- */
/* Error                                                                */
/* -------------------------------------------------------------------- */

/** Kode dari KONTRAK bagian 2, ditambah dua kode yang dibuat di sisi klien. */
export type ApiErrorCode =
  | "VALIDASI_GAGAL"
  | "KREDENSIAL_SALAH"
  | "TIDAK_TERAUTENTIKASI"
  | "TOKEN_KEDALUWARSA"
  | "AKUN_MENUNGGU"
  | "AKUN_NONAKTIF"
  | "AKUN_TERKUNCI"
  | "AKSES_DITOLAK"
  | "TIDAK_DITEMUKAN"
  | "DUPLIKAT"
  | "TANGGAL_DI_LUAR_PRAKIRAAN"
  | "DATA_CUACA_TIDAK_TERSEDIA"
  | "SERVER_ERROR"
  | "JARINGAN_GAGAL"
  | "RESPON_TIDAK_VALID";

export class ApiError extends Error {
  readonly code: ApiErrorCode | (string & {});
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(
    code: ApiError["code"],
    message: string,
    status: number,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

/** Pesan aman untuk ditampilkan ke pengguna. */
export function getErrorMessage(e: unknown): string {
  if (isApiError(e)) return e.message;
  return "Terjadi kesalahan tak terduga. Coba lagi.";
}

function keApiError(status: number, json: unknown): ApiError {
  const parsed = ApiErrorEnvelopeSchema.safeParse(json);
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    return new ApiError(code, message, status, details ?? {});
  }
  return new ApiError("SERVER_ERROR", "Terjadi kesalahan pada server. Coba lagi nanti.", status);
}

/* -------------------------------------------------------------------- */
/* Lapisan fetch                                                        */
/* -------------------------------------------------------------------- */

type Query = Record<string, string | number | boolean | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

function bangunUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined) params.set(k, String(v));
  }
  const qs = params.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ""}`;
}

/** Sesi habis: server sudah menghapus cookie token, jadi cukup arahkan ke halaman login. */
function sesiBerakhir(): void {
  if (typeof window !== "undefined" && window.location.pathname !== HALAMAN_LOGIN) {
    window.location.assign(HALAMAN_LOGIN);
  }
}

async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  opts: RequestOptions = {},
): Promise<z.infer<S>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers,
    credentials: "same-origin",
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  if (opts.signal) init.signal = opts.signal;

  let res: Response;
  try {
    res = await fetch(bangunUrl(path, opts.query), init);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(
      "JARINGAN_GAGAL",
      "Tidak dapat terhubung ke server. Periksa koneksi Anda.",
      0,
    );
  }

  const json: unknown = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const galat = keApiError(res.status, json);
    if (galat.code === "TIDAK_TERAUTENTIKASI" || galat.code === "TOKEN_KEDALUWARSA") sesiBerakhir();
    throw galat;
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError("RESPON_TIDAK_VALID", "Data dari server tidak sesuai kontrak API.", 502, {
      issues: parsed.error.issues,
    });
  }
  return parsed.data;
}

/* -------------------------------------------------------------------- */
/* Endpoint                                                             */
/* -------------------------------------------------------------------- */

export const api = {
  auth: {
    me: async () => (await request("/auth/me", dataEnvelope(UserSchema))).data,
  },

  lahan: {
    list: async () => (await request("/lahan", dataEnvelope(z.array(LahanSchema)))).data,
    cuaca: async (idLahan: number) =>
      (await request(`/lahan/${idLahan}/cuaca`, dataEnvelope(CuacaSchema))).data,
    prediksi: async (idLahan: number) =>
      (await request(`/lahan/${idLahan}/prediksi`, dataEnvelope(PrediksiSchema))).data,
    jadwal: async (idLahan: number, aktivitas?: Aktivitas) =>
      (
        await request(`/lahan/${idLahan}/jadwal`, dataEnvelope(z.array(JadwalItemSchema)), {
          query: { aktivitas },
        })
      ).data,
  },

  musimTanam: {
    list: async (idLahan: number) =>
      (await request(`/lahan/${idLahan}/musim-tanam`, dataEnvelope(z.array(MusimTanamSchema))))
        .data,
    create: async (idLahan: number, input: MusimTanamInput) =>
      (
        await request(`/lahan/${idLahan}/musim-tanam`, dataEnvelope(MusimTanamSchema), {
          method: "POST",
          body: input,
        })
      ).data,
    update: async (idMusimTanam: number, input: Partial<MusimTanamInput>) =>
      (
        await request(`/musim-tanam/${idMusimTanam}`, dataEnvelope(MusimTanamSchema), {
          method: "PATCH",
          body: input,
        })
      ).data,
  },

  simulasi: {
    waktuTanam: async (input: SimulasiInput) =>
      (
        await request("/simulasi/waktu-tanam", dataEnvelope(SimulasiSchema), {
          method: "POST",
          body: input,
        })
      ).data,
  },

  notifikasi: {
    /** Mengembalikan { data, meta } karena daftar ini berpaging. */
    list: (params: { dibaca?: boolean; page?: number } = {}) =>
      request("/notifikasi", pagedEnvelope(NotifikasiSchema), { query: params }),
    baca: async (idNotifikasi: number) =>
      (
        await request(`/notifikasi/${idNotifikasi}/baca`, dataEnvelope(BacaNotifikasiSchema), {
          method: "PATCH",
        })
      ).data,
  },

  validasi: {
    antrean: async () =>
      (
        await request(
          "/rekomendasi/antrean-validasi",
          dataEnvelope(z.array(AntreanValidasiItemSchema)),
        )
      ).data,
    koreksi: async (idRekomendasi: number, input: KoreksiInput) =>
      (
        await request(`/rekomendasi/${idRekomendasi}/koreksi`, dataEnvelope(KoreksiHasilSchema), {
          method: "PATCH",
          body: input,
        })
      ).data,
  },
};

/* -------------------------------------------------------------------- */
/* Kunci cache TanStack Query                                           */
/* -------------------------------------------------------------------- */

export const queryKeys = {
  lahan: ["lahan"] as const,
  cuaca: (id: number) => ["lahan", id, "cuaca"] as const,
  prediksi: (id: number) => ["lahan", id, "prediksi"] as const,
  jadwal: (id: number, aktivitas?: Aktivitas) =>
    ["lahan", id, "jadwal", aktivitas ?? "semua"] as const,
  musimTanam: (id: number) => ["lahan", id, "musim-tanam"] as const,
  notifikasi: (dibaca?: boolean, page?: number) => ["notifikasi", { dibaca, page }] as const,
  antreanValidasi: ["rekomendasi", "antrean-validasi"] as const,
};
