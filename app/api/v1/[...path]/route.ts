// app/api/v1/[...path]/route.ts
//
// Proxy server-side dari browser ke Flask:
//   browser --(cookie httpOnly, origin yang sama)--> Next.js --(Authorization: Bearer)--> Flask
//
// - JWT tidak pernah sampai ke JavaScript browser.
// - Access token kedaluwarsa (401 TOKEN_KEDALUWARSA) di-refresh di sini, lalu request diulang sekali.
// - Karena browser hanya bicara ke domain Next.js, tidak ada CORS.
//
// PENTING: hapus `rewrites()` untuk /api/v1 dari next.config.ts. Rewrite "afterFiles" mengalahkan
// route dinamis ini, sehingga request akan melewati proxy dan tidak membawa token.

import { type NextRequest, NextResponse } from "next/server";
import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  clearTokenCookies,
  setAccessCookie,
} from "@/lib/auth-cookies";
import {
  BackendConfigError,
  backendBaseUrl,
  backendFetch,
  galatBackend,
  refreshAccessToken,
} from "@/lib/backend";
import { ApiErrorEnvelopeSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

interface Konteks {
  params: Promise<{ path: string[] }>;
}

/**
 * Login dan refresh harus lewat server action, bukan proxy ini: responsnya berisi token mentah
 * yang tidak boleh terbaca oleh JavaScript di browser.
 */
const DIBLOKIR = new Set(["auth/login", "auth/refresh"]);

interface TokenBaru {
  access_token: string;
  expires_in: number;
}

interface HasilBackend {
  status: number;
  teks: string;
  contentType: string | null;
}

const galat = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message, details: {} } }, { status });

function sesiHabis(): NextResponse {
  const res = galat(401, "TIDAK_TERAUTENTIKASI", "Sesi berakhir. Silakan masuk kembali.");
  clearTokenCookies(res.cookies);
  return res;
}

/** Tolak segmen berbahaya (path traversal, pemisah path, query). Kembalikan path yang sudah di-encode. */
function pathAman(segmen: string[]): string | null {
  if (segmen.length === 0) return null;
  for (const s of segmen) {
    if (s === "" || s === "." || s === ".." || /[\\/\0?#]/.test(s)) return null;
  }
  return segmen.map(encodeURIComponent).join("/");
}

/** Pertahanan CSRF tambahan di atas SameSite=Lax: permintaan ubah-data dari origin lain ditolak. */
function asalCocok(req: NextRequest): boolean {
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.get("origin");
  if (!origin) return true; // klien non-browser; bukan vektor CSRF
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

function kodeGalat(teks: string): string | null {
  try {
    const parsed = ApiErrorEnvelopeSchema.safeParse(JSON.parse(teks));
    return parsed.success ? parsed.data.error.code : null;
  } catch {
    return null;
  }
}

async function teruskan(
  req: NextRequest,
  path: string,
  body: ArrayBuffer | undefined,
  access: string | undefined,
): Promise<HasilBackend> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const contentType = req.headers.get("content-type");
  if (body && contentType) headers["Content-Type"] = contentType;
  if (access) headers.Authorization = `Bearer ${access}`;

  const init: RequestInit = { method: req.method, headers };
  if (body) init.body = body;

  const res = await backendFetch(`/${path}${req.nextUrl.search}`, init);
  return {
    status: res.status,
    teks: await res.text(),
    contentType: res.headers.get("content-type"),
  };
}

function jawab(hasil: HasilBackend, tokenBaru: TokenBaru | null): NextResponse {
  const res = new NextResponse(hasil.status === 204 ? null : hasil.teks, {
    status: hasil.status,
    headers: {
      "Content-Type": hasil.contentType ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
  if (tokenBaru) setAccessCookie(res.cookies, tokenBaru.access_token, tokenBaru.expires_in);
  return res;
}

async function proxy(req: NextRequest, { params }: Konteks): Promise<NextResponse> {
  const { path: segmen } = await params;
  const path = pathAman(segmen);
  if (!path || DIBLOKIR.has(segmen.join("/"))) {
    return galat(404, "TIDAK_DITEMUKAN", "Endpoint tidak ditemukan.");
  }
  if (!asalCocok(req)) {
    return galat(403, "AKSES_DITOLAK", "Asal permintaan tidak diizinkan.");
  }
  try {
    backendBaseUrl();
  } catch (e) {
    if (e instanceof BackendConfigError) {
      return galat(500, "SERVER_ERROR", "Konfigurasi server belum lengkap.");
    }
    throw e;
  }

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  const refresh = req.cookies.get(COOKIE_REFRESH)?.value;
  let access = req.cookies.get(COOKIE_ACCESS)?.value;
  let tokenBaru: TokenBaru | null = null;

  try {
    // Cookie access sudah habis masa berlakunya (maxAge) tetapi refresh masih ada: refresh dulu.
    if (!access && refresh) {
      tokenBaru = await refreshAccessToken(refresh);
      if (!tokenBaru) return sesiHabis();
      access = tokenBaru.access_token;
    }

    let hasil = await teruskan(req, path, body, access);

    if (hasil.status === 401 && kodeGalat(hasil.teks) === "TOKEN_KEDALUWARSA" && !tokenBaru) {
      if (!refresh) return sesiHabis();
      tokenBaru = await refreshAccessToken(refresh);
      if (!tokenBaru) return sesiHabis();
      hasil = await teruskan(req, path, body, tokenBaru.access_token);
    }

    return jawab(hasil, tokenBaru);
  } catch (e) {
    const g = galatBackend(e);
    return galat(g.status, g.code, g.message);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
