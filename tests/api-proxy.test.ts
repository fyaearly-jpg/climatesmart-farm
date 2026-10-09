// tests/api-proxy.test.ts
// Route handler app/api/v1/[...path]: cookie httpOnly -> Authorization: Bearer ke Flask,
// refresh token di server, dan pertahanan dasar (path, origin, endpoint token).

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH, POST } from "@/app/api/v1/[...path]/route";

const BACKEND = "http://backend.test";
const fetchMock = vi.fn();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const galat = (code: string, status: number) =>
  json({ error: { code, message: `pesan ${code}` } }, status);

function req(
  path: string,
  init: { method?: string; cookie?: string; headers?: Record<string, string>; body?: string } = {},
) {
  const headers = new Headers({ host: "app.test", ...init.headers });
  if (init.cookie) headers.set("cookie", init.cookie);
  return new NextRequest(`http://app.test/api/v1/${path}`, {
    method: init.method ?? "GET",
    headers,
    ...(init.body !== undefined ? { body: init.body } : {}),
  });
}
const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) });
const panggilan = (i: number) => fetchMock.mock.calls[i] as [string, RequestInit];
const authHeader = (i: number) => (panggilan(i)[1].headers as Record<string, string>).Authorization;

beforeEach(() => {
  vi.stubEnv("BACKEND_URL", `${BACKEND}/`);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("proxy /api/v1: meneruskan ke Flask", () => {
  it("menyematkan Bearer dari cookie dan menyalin status serta isi respons", async () => {
    fetchMock.mockResolvedValue(json({ data: [{ id_lahan: 1 }] }));
    const res = await GET(
      req("lahan/5/jadwal?aktivitas=tanam", { cookie: "csf_at=AT" }),
      ctx(["lahan", "5", "jadwal"]),
    );

    expect(panggilan(0)[0]).toBe(`${BACKEND}/api/v1/lahan/5/jadwal?aktivitas=tanam`);
    expect(authHeader(0)).toBe("Bearer AT");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [{ id_lahan: 1 }] });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("tanpa cookie: tidak ada header Authorization", async () => {
    fetchMock.mockResolvedValue(galat("TIDAK_TERAUTENTIKASI", 401));
    const res = await GET(req("lahan"), ctx(["lahan"]));
    expect(authHeader(0)).toBeUndefined();
    expect(res.status).toBe(401);
  });

  it("POST meneruskan isi dan content-type", async () => {
    fetchMock.mockResolvedValue(json({ data: { ok: true } }, 201));
    const res = await POST(
      req("simulasi/waktu-tanam", {
        method: "POST",
        cookie: "csf_at=AT",
        headers: { "content-type": "application/json", origin: "http://app.test" },
        body: JSON.stringify({ id_lahan: 5 }),
      }),
      ctx(["simulasi", "waktu-tanam"]),
    );
    const [, init] = panggilan(0);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe('{"id_lahan":5}');
    expect(res.status).toBe(201);
  });

  it("PATCH dan DELETE diekspor dan diteruskan", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const a = await PATCH(
      req("notifikasi/3/baca", { method: "PATCH", cookie: "csf_at=AT" }),
      ctx(["notifikasi", "3", "baca"]),
    );
    const b = await DELETE(
      req("lahan/9", { method: "DELETE", cookie: "csf_at=AT" }),
      ctx(["lahan", "9"]),
    );
    expect(a.status).toBe(204);
    expect(b.status).toBe(204);
  });
});

describe("proxy /api/v1: refresh token di server", () => {
  it("401 TOKEN_KEDALUWARSA -> refresh, ulangi dengan token baru, set cookie access baru", async () => {
    fetchMock
      .mockResolvedValueOnce(galat("TOKEN_KEDALUWARSA", 401))
      .mockResolvedValueOnce(json({ data: { access_token: "NEW", expires_in: 1800 } }))
      .mockResolvedValueOnce(json({ data: ["ok"] }));

    const res = await GET(req("lahan", { cookie: "csf_at=OLD; csf_rt=RT" }), ctx(["lahan"]));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(panggilan(1)[0]).toBe(`${BACKEND}/api/v1/auth/refresh`);
    expect(JSON.parse(panggilan(1)[1].body as string)).toEqual({ refresh_token: "RT" });
    expect(authHeader(2)).toBe("Bearer NEW");
    expect(res.status).toBe(200);
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith("csf_at=NEW"));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Max-Age=1800/i);
  });

  it("cookie access sudah hilang tetapi refresh ada -> refresh dulu sebelum request", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ data: { access_token: "NEW", expires_in: 1800 } }))
      .mockResolvedValueOnce(json({ data: [] }));
    const res = await GET(req("lahan", { cookie: "csf_rt=RT" }), ctx(["lahan"]));
    expect(panggilan(0)[0]).toContain("/auth/refresh");
    expect(authHeader(1)).toBe("Bearer NEW");
    expect(res.status).toBe(200);
  });

  it("refresh gagal -> 401 TIDAK_TERAUTENTIKASI dan kedua cookie dihapus", async () => {
    fetchMock
      .mockResolvedValueOnce(galat("TOKEN_KEDALUWARSA", 401))
      .mockResolvedValueOnce(galat("TIDAK_TERAUTENTIKASI", 401));
    const res = await GET(req("lahan", { cookie: "csf_at=OLD; csf_rt=RT" }), ctx(["lahan"]));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("TIDAK_TERAUTENTIKASI");
    const set = res.headers.getSetCookie();
    expect(set.some((c) => c.startsWith("csf_at=;"))).toBe(true);
    expect(set.some((c) => c.startsWith("csf_rt=;"))).toBe(true);
  });

  it("TOKEN_KEDALUWARSA tanpa cookie refresh -> sesi habis", async () => {
    fetchMock.mockResolvedValue(galat("TOKEN_KEDALUWARSA", 401));
    const res = await GET(req("lahan", { cookie: "csf_at=OLD" }), ctx(["lahan"]));
    expect((await res.json()).error.code).toBe("TIDAK_TERAUTENTIKASI");
  });

  it("refresh berhasil tapi cookie refresh ada dan token baru dipakai: tidak mengulang tanpa batas", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ data: { access_token: "NEW", expires_in: 1800 } }))
      .mockResolvedValueOnce(galat("TOKEN_KEDALUWARSA", 401));
    const res = await GET(req("lahan", { cookie: "csf_rt=RT" }), ctx(["lahan"]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(401);
  });

  it("401 selain TOKEN_KEDALUWARSA diteruskan apa adanya tanpa refresh", async () => {
    fetchMock.mockResolvedValue(galat("AKSES_DITOLAK", 403));
    const res = await GET(
      req("rekomendasi/antrean-validasi", { cookie: "csf_at=AT; csf_rt=RT" }),
      ctx(["rekomendasi", "antrean-validasi"]),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(403);
  });
});

describe("proxy /api/v1: pertahanan", () => {
  it.each([["auth/login"], ["auth/refresh"]])(
    "memblokir %s (token mentah tidak boleh lewat proxy)",
    async (p) => {
      const res = await POST(req(p, { method: "POST" }), ctx(p.split("/")));
      expect(res.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([[[".."]], [["lahan", ".."]], [[""]], [["a/b"]], [["a?x=1"]], [[]]])(
    "menolak path berbahaya %j",
    async (segmen) => {
      const res = await GET(req("x"), ctx(segmen));
      expect(res.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("menolak permintaan ubah-data dari origin lain (CSRF)", async () => {
    const res = await POST(
      req("simulasi/waktu-tanam", {
        method: "POST",
        cookie: "csf_at=AT",
        headers: { origin: "http://jahat.test" },
        body: "{}",
      }),
      ctx(["simulasi", "waktu-tanam"]),
    );
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menolak Origin yang tidak bisa di-parse", async () => {
    const res = await POST(
      req("lahan", { method: "POST", headers: { origin: "bukan-url" }, body: "{}" }),
      ctx(["lahan"]),
    );
    expect(res.status).toBe(403);
  });

  it("BACKEND_URL kosong -> 500 dengan pesan aman", async () => {
    vi.stubEnv("BACKEND_URL", "");
    const res = await GET(req("lahan"), ctx(["lahan"]));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("SERVER_ERROR");
  });

  it("backend tidak terjangkau -> 502; timeout -> 504", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect((await GET(req("lahan"), ctx(["lahan"]))).status).toBe(502);

    const timeout = new Error("timeout");
    timeout.name = "TimeoutError";
    fetchMock.mockRejectedValueOnce(timeout);
    const res = await GET(req("lahan"), ctx(["lahan"]));
    expect(res.status).toBe(504);
    expect((await res.json()).error.code).toBe("JARINGAN_GAGAL");
  });

  it("respons non-JSON dari backend tetap diteruskan (kode galat tidak terbaca)", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>Bad Gateway</html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      }),
    );
    const res = await GET(req("lahan", { cookie: "csf_at=AT" }), ctx(["lahan"]));
    expect(res.status).toBe(502);
    expect(res.headers.get("content-type")).toBe("text/html");
  });
});
