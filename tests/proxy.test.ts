import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session-core";
import { config, proxy } from "@/proxy";

function requestTo(path: string, token?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: token ? { cookie: `${SESSION_COOKIE}=${token}` } : {},
  });
}

describe("proxy.ts (penjaga rute /dashboard)", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "p".repeat(40));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hanya berlaku untuk /dashboard/*", () => {
    expect(config.matcher).toEqual(["/dashboard/:path*"]);
  });

  it("tanpa sesi -> redirect ke /login dengan parameter next", () => {
    const res = proxy(requestTo("/dashboard/validasi"));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/dashboard/validasi");
  });

  it("cookie lama teks-biasa (csf_role=admin) tidak dianggap sesi", () => {
    const req = new NextRequest("http://localhost:3000/dashboard/admin", {
      headers: { cookie: "csf_role=admin; csf_name=Hacker" },
    });
    expect(proxy(req).status).toBe(307);
  });

  it("token yang dipalsukan ditolak", () => {
    const res = proxy(requestTo("/dashboard", "eyJyb2xlIjoiYWRtaW4ifQ.palsu"));
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/login");
  });

  it("petani boleh ke /dashboard dan /dashboard/tambah-lahan", () => {
    const token = createSessionToken("petani", "Budi");
    expect(proxy(requestTo("/dashboard", token)).headers.get("location")).toBeNull();
    expect(proxy(requestTo("/dashboard/tambah-lahan", token)).headers.get("location")).toBeNull();
  });

  it("petani dialihkan dari /dashboard/validasi dan /dashboard/admin", () => {
    const token = createSessionToken("petani", "Budi");
    for (const path of ["/dashboard/validasi", "/dashboard/admin"]) {
      const location = new URL(proxy(requestTo(path, token)).headers.get("location") ?? "");
      expect(location.pathname).toBe("/dashboard");
      expect(location.searchParams.get("denied")).not.toBeNull();
    }
  });

  it("penyuluh hanya boleh ke /dashboard/validasi (bukan admin/tambah-lahan)", () => {
    const token = createSessionToken("penyuluh", "Bu Sari");
    expect(proxy(requestTo("/dashboard/validasi", token)).headers.get("location")).toBeNull();
    expect(proxy(requestTo("/dashboard/admin", token)).status).toBe(307);
    expect(proxy(requestTo("/dashboard/tambah-lahan", token)).status).toBe(307);
  });

  it("admin hanya boleh ke /dashboard/admin (bukan validasi)", () => {
    const token = createSessionToken("admin", "Admin");
    expect(proxy(requestTo("/dashboard/admin", token)).headers.get("location")).toBeNull();
    const denied = new URL(
      proxy(requestTo("/dashboard/validasi", token)).headers.get("location") ?? "",
    );
    expect(denied.searchParams.get("denied")).toBe("penyuluh");
  });
});
