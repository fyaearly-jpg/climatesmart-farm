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
        ],
      },
    ];
  },
};

export default nextConfig;
