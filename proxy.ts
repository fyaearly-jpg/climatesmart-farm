// proxy.ts (Next.js 16 — menggantikan middleware.ts, berjalan di Node.js
// runtime penuh, bukan Edge runtime terbatas seperti sebelumnya)
//
// Modul 6 / Bab g & k: proxy server-side memeriksa sesi (cookie httpOnly,
// tidak bisa dibaca JS klien — mitigasi XSS session-theft dasar) sebelum
// request mencapai halaman manapun di bawah /dashboard. Tiga tingkat
// proteksi: (1) belum login -> /login, (2) /dashboard/validasi khusus
// role "penyuluh", (3) /dashboard/admin khusus role "admin".
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const role = request.cookies.get("csf_role")?.value;
  const { pathname } = request.nextUrl;

  if (!role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/dashboard/validasi") && role !== "penyuluh") {
    const url = new URL("/dashboard", request.url);
    url.searchParams.set("denied", "penyuluh");
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/dashboard/admin") && role !== "admin") {
    const url = new URL("/dashboard", request.url);
    url.searchParams.set("denied", "admin");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
