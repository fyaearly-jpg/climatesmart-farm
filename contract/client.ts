// contract/client.ts
// Klien HTTP untuk uji kontrak. Memanggil backend LANGSUNG (bukan lewat Next.js), jadi yang diuji adalah
// jawaban Flask apa adanya. Setiap ketidakcocokan dilaporkan dengan pesan yang menyebut endpoint, status,
// dan field yang salah, supaya pemegang backend langsung tahu apa yang harus diperbaiki.

import type { z } from "zod";
import { ApiErrorEnvelopeSchema } from "@/lib/schemas";

const HOST_LOKAL = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"]);

export function alamatDasar(): string {
  const mentah = process.env.CONTRACT_BASE_URL ?? process.env.BACKEND_URL ?? "http://127.0.0.1:5000";
  return mentah.trim().replace(/\/+$/, "");
}

/**
 * Uji ini MEMBUAT data (akun, lahan, musim tanam) dan mengubah status rekomendasi. Menjalankannya ke
 * server bersama atau produksi bisa mengotori data sungguhan, jadi hanya host lokal yang diizinkan
 * kecuali CONTRACT_ALLOW_REMOTE=1 diisi dengan sengaja.
 */
export function pastikanTargetAman(): void {
  const url = new URL(alamatDasar());
  if (HOST_LOKAL.has(url.hostname) || process.env.CONTRACT_ALLOW_REMOTE === "1") return;
  throw new Error(
    `Uji kontrak menolak berjalan ke ${url.host}: bukan host lokal, dan uji ini membuat data. ` +
      "Jalankan terhadap backend lokal atau server tiruan. Bila Anda memang yakin (server uji khusus), " +
      "isi CONTRACT_ALLOW_REMOTE=1.",
  );
}

export interface Respons {
  status: number;
  jenis: string;
  teks: string;
  json: unknown;
  ms: number;
}

interface Opsi {
  token?: string;
  body?: unknown;
  /** Isi mentah (untuk menguji JSON yang rusak). */
  teksMentah?: string;
}

export async function panggil(metode: string, path: string, opsi: Opsi = {}): Promise<Respons> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: string | undefined;
  if (opsi.teksMentah !== undefined) body = opsi.teksMentah;
  else if (opsi.body !== undefined) body = JSON.stringify(opsi.body);
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (opsi.token) headers.Authorization = `Bearer ${opsi.token}`;

  const init: RequestInit = { method: metode, headers, signal: AbortSignal.timeout(20_000) };
  if (body !== undefined) init.body = body;

  const mulai = performance.now();
  let res: Response;
  try {
    res = await fetch(`${alamatDasar()}/api/v1${path}`, init);
  } catch (e) {
    const sebab = e instanceof Error ? e.message : String(e);
    throw new Error(`Tidak dapat terhubung ke ${alamatDasar()} (${sebab}). Apakah backend atau server tiruan sudah menyala?`);
  }
  const teks = await res.text();
  const ms = Math.round(performance.now() - mulai);

  let json: unknown = null;
  try {
    json = teks ? JSON.parse(teks) : null;
  } catch {
    // bukan JSON: dibiarkan null, pemeriksa di bawah yang melaporkan
  }
  return { status: res.status, jenis: res.headers.get("content-type") ?? "", teks, json, ms };
}

const ringkas = (teks: string) => (teks.length > 300 ? `${teks.slice(0, 300)}...` : teks);

/** Memeriksa status dan bentuk respons sukses terhadap skema Zod. Melempar galat yang menunjuk field bermasalah. */
export function cocokkan<S extends z.ZodType>(
  schema: S,
  res: Respons,
  konteks: string,
  statusDiharapkan = 200,
): z.infer<S> {
  if (res.status !== statusDiharapkan) {
    throw new Error(`[KONTRAK] ${konteks}: HTTP ${res.status}, seharusnya ${statusDiharapkan}\n  isi: ${ringkas(res.teks)}`);
  }
  const hasil = schema.safeParse(res.json);
  if (hasil.success) return hasil.data;
  const baris = hasil.error.issues
    .slice(0, 10)
    .map((i) => `  - ${i.path.join(".") || "(akar)"}: ${i.message}`)
    .join("\n");
  const lebih = hasil.error.issues.length > 10 ? `\n  ...dan ${hasil.error.issues.length - 10} masalah lain` : "";
  throw new Error(`[KONTRAK] ${konteks}: bentuk respons tidak sesuai skema\n${baris}${lebih}\n  isi: ${ringkas(res.teks)}`);
}

export interface RincianGalat {
  message: string;
  details: Record<string, unknown>;
}

/** Memeriksa bahwa galat berbentuk amplop KONTRAK (JSON, bukan HTML) dengan kode dan status yang tepat. */
export function harapkanGalat(res: Respons, status: number, code: string, konteks: string): RincianGalat {
  if (!res.jenis.includes("application/json")) {
    throw new Error(
      `[KONTRAK] ${konteks}: galat harus berupa JSON amplop { error: { code, message, details } }, tetapi Content-Type '${res.jenis || "kosong"}' (HTTP ${res.status}).\n  isi: ${ringkas(res.teks)}`,
    );
  }
  const parsed = ApiErrorEnvelopeSchema.safeParse(res.json);
  if (!parsed.success) {
    throw new Error(`[KONTRAK] ${konteks}: amplop galat tidak sesuai (HTTP ${res.status}).\n  isi: ${ringkas(res.teks)}`);
  }
  const { code: kode, message, details } = parsed.data.error;
  if (res.status !== status || kode !== code) {
    throw new Error(`[KONTRAK] ${konteks}: diharapkan HTTP ${status} ${code}, tetapi HTTP ${res.status} ${kode}\n  pesan: ${message}`);
  }
  if (details === undefined) {
    throw new Error(`[KONTRAK] ${konteks}: galat ${code} harus menyertakan "details" (objek, boleh kosong)`);
  }
  if (!message.trim()) throw new Error(`[KONTRAK] ${konteks}: "message" galat tidak boleh kosong`);
  return { message, details };
}

/**
 * Untuk kasus yang KONTRAK belum menetapkan kodenya (misalnya password_lama salah): cukup pastikan
 * galat klien (4xx) dalam amplop JSON yang benar, dan bukan 5xx atau HTML.
 */
export function harapkanGalatKlien(res: Respons, konteks: string): RincianGalat {
  if (res.status < 400 || res.status > 499) {
    throw new Error(`[KONTRAK] ${konteks}: seharusnya galat klien (4xx), tetapi HTTP ${res.status}\n  isi: ${ringkas(res.teks)}`);
  }
  return harapkanGalat(res, res.status, ApiErrorEnvelopeSchema.safeParse(res.json).data?.error.code ?? "", konteks);
}

/** 204 harus benar-benar tanpa isi. */
export function harapkanTanpaIsi(res: Respons, konteks: string): void {
  if (res.status !== 204 || res.teks !== "") {
    throw new Error(`[KONTRAK] ${konteks}: seharusnya HTTP 204 tanpa isi, tetapi HTTP ${res.status} dengan isi: ${ringkas(res.teks) || "(kosong)"}`);
  }
}
