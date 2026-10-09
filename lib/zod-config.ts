// lib/zod-config.ts
//
// Bab k (CSP): kebijakan keamanan situs tidak mengizinkan 'unsafe-eval'. Zod 4 mencoba
// `new Function("")` untuk kompilasi JIT, dan browser melaporkannya sebagai pelanggaran CSP.
// Mode `jitless` melewati percobaan itu. Hanya diaktifkan di browser; di server (Node)
// tidak ada CSP sehingga JIT yang lebih cepat tetap dipakai.
//
// PENTING: konfigurasi ini sengaja ada di modul sendiri dan diimpor PALING ATAS oleh setiap
// berkas yang membuat skema (schemas.ts dan schemas.legacy.ts). Zod memutuskan memakai JIT
// atau tidak saat sebuah skema objek DIBUAT. Impor ES dievaluasi lebih dulu daripada isi
// berkas, jadi kalau `z.config` ditaruh di badan schemas.ts, skema di berkas yang diekspor
// ulang (`export * from`) akan dibuat sebelum konfigurasi ini berjalan.

import { z } from "zod";

if (typeof window !== "undefined") {
  z.config({ jitless: true });
}
