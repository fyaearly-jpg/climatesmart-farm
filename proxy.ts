// proxy.ts (Next.js 16 — menggantikan middleware.ts, berjalan di Node.js
// runtime penuh, bukan Edge runtime terbatas seperti sebelumnya)
//
// Modul 6 / Bab g & k: proxy server-side memeriksa sesi (cookie httpOnly
// BERTANDA-TANGAN HMAC, lihat lib/session-core.ts — tidak bisa dipalsukan
// dari klien) sebelum request mencapai halaman manapun di bawah /dashboard.
// Empat tingkat proteksi: (1) belum login / sesi tidak valid -> /login,
// (2) /dashboard/validasi khusus "penyuluh", (3) /dashboard/admin khusus
// "admin", (4) /dashboard/tambah-lahan khusus "petani".
// Endpoint /api/* dijaga terpisah lewat lib/api-auth.ts (respons 401/403 JSON).

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-core";

export function proxy(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const restricted: { prefix: string; role: string }[] = [
    { prefix: "/dashboard/validasi", role: "penyuluh" },
    { prefix: "/dashboard/admin", role: "admin" },
    { prefix: "/dashboard/tambah-lahan", role: "petani" },
  ];
  for (const rule of restricted) {
    if (pathname.startsWith(rule.prefix) && session.role !== rule.role) {
      const url = new URL("/dashboard", request.url);
      url.searchParams.set("denied", rule.role);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
