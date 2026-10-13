// tests/proxy-petani-routes.test.ts
// proxy.ts: halaman petani (simulasi, musim tanam, notifikasi) hanya untuk peran petani.

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import type { Role } from "@/lib/schemas";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session-core";
import { proxy } from "@/proxy";

function minta(path: string, role?: Role) {
  const headers = new Headers();
  if (role) headers.set("cookie", `${SESSION_COOKIE}=${createSessionToken(role, "Uji")}`);
  return proxy(new NextRequest(`http://app.test${path}`, { headers }));
}

describe.each(["/dashboard/simulasi", "/dashboard/musim-tanam", "/dashboard/notifikasi"])(
  "proxy %s",
  (path) => {
    it("petani diizinkan", () => {
      const res = minta(path, "petani");
      expect(res.headers.get("location")).toBeNull();
    });

    it.each(["penyuluh", "admin"] as const)("%s dialihkan ke /dashboard?denied=petani", (role) => {
      const res = minta(path, role);
      const lokasi = new URL(res.headers.get("location") ?? "http://kosong");
      expect(lokasi.pathname).toBe("/dashboard");
      expect(lokasi.searchParams.get("denied")).toBe("petani");
    });

    it("tanpa sesi dialihkan ke /login dengan parameter next", () => {
      const lokasi = new URL(minta(path).headers.get("location") ?? "http://kosong");
      expect(lokasi.pathname).toBe("/login");
      expect(lokasi.searchParams.get("next")).toBe(path);
    });
  },
);

describe("proxy: aturan lama tetap berlaku", () => {
  it("validasi hanya penyuluh, admin hanya admin", () => {
    expect(
      new URL(
        minta("/dashboard/validasi", "petani").headers.get("location") ?? "http://x",
      ).searchParams.get("denied"),
    ).toBe("penyuluh");
    expect(
      new URL(
        minta("/dashboard/admin", "petani").headers.get("location") ?? "http://x",
      ).searchParams.get("denied"),
    ).toBe("admin");
    expect(minta("/dashboard/validasi", "penyuluh").headers.get("location")).toBeNull();
  });
});
