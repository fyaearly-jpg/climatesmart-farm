// next.config.ts
//
// Modul 8 mensyaratkan optimasi vite.config.ts (path alias, manualChunks,
// target esnext) — tidak berlaku literal di sini karena Next.js App Router
// TIDAK berjalan di atas Vite (lihat catatan arsitektur di laporan Modul
// 8). Padanan yang benar-benar berlaku pada Next.js 16 didaftarkan di
// bawah ini satu per satu:
//   - Path alias "@/*"        -> sudah bawaan tsconfig.json (moduleResolution: bundler)
//   - Dev server & HMR cepat  -> Turbopack (flag --turbopack pada "next dev", default Next 16)
//   - manualChunks (vendor)   -> code-splitting OTOMATIS per-rute (App Router)
//                                 + dynamic import() manual untuk komponen berat (lihat
//                                 components/modules/ValidationTableClient.tsx)
//   - target: "esnext", minify -> ditangani otomatis oleh next build (Turbopack production
//                                  build, minifikasi SWC)
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Bab k — Content Security Policy. 'unsafe-inline' pada script-src dibutuhkan
// oleh skrip bootstrap inline Next.js; CSP berbasis nonce yang lebih ketat
// memaksa seluruh halaman dirender dinamis (landing page tidak lagi statis),
// jadi di sini dipilih kompromi ini dan dicatat sebagai keterbatasan di laporan.
// 'unsafe-eval' & ws: hanya aktif saat development (React Refresh / HMR).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.pexels.com",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  images: {
    // Bab j (Core Web Vitals): next/image dipakai untuk hero LCP element —
    // domain foto asli (Pexels, lisensi bebas) didaftarkan di sini agar
    // Next.js bisa mengoptimasi (resize, format AVIF/WebP otomatis).
    remotePatterns: [{ protocol: "https", hostname: "images.pexels.com" }],
  },
  // Header keamanan dasar setara semangat Modul 6 (server security) —
  // dijalankan di edge oleh Next.js, bukan middleware.ts, agar berlaku ke
  // seluruh rute termasuk aset statis.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
