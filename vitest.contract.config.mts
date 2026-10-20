// vitest.contract.config.mts
// Konfigurasi khusus uji kontrak. Sengaja terpisah dari konfigurasi tes biasa: uji kontrak butuh backend yang
// sedang menyala, jadi TIDAK boleh ikut berjalan pada `npx vitest run` atau di CI.
// Jalankan: npm run test:contract

import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const akar = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => ({
  resolve: { alias: { "@": akar } },
  test: {
    include: ["contract/**/*.contract.ts"],
    environment: "node",
    // Memuat .env.local agar BACKEND_URL sama dengan yang dipakai `npm run dev`.
    env: loadEnv(mode, akar, ""),
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    reporters: ["verbose"],
  },
}));
