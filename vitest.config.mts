// vitest.config.ts — unit/integration test + coverage (Bab m: automated testing)
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: root("./") },
      // "server-only" sengaja melempar error di luar Server Component; di test cukup stub kosong.
      { find: "server-only", replacement: root("./tests/stubs/server-only.ts") },
    ],
  },
  test: {
    globals: true, // dibutuhkan Testing Library untuk cleanup otomatis antar test
    environment: "node", // komponen React memakai `// @vitest-environment jsdom` per berkas
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "hooks/**/*.ts",
        "lib/**/*.ts",
        "store/**/*.ts",
        "proxy.ts",
      ],
      // Harus SAMA dengan sonar.coverage.exclusions di sonar-project.properties.
      exclude: ["**/*.d.ts"],
    },
  },
});
