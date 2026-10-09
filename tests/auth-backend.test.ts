// tests/auth-backend.test.ts
// lib/backend.ts (login, refresh, galat jaringan) dan lib/auth-cookies.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  type CookieJar,
  type CookieOptions,
  clearTokenCookies,
  REFRESH_MAX_AGE_DETIK,
  setAccessCookie,
  setTokenCookies,
} from "@/lib/auth-cookies";
import { backendBaseUrl, galatBackend, loginBackend, refreshAccessToken } from "@/lib/backend";

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.stubEnv("BACKEND_URL", "http://backend.test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const LOGIN_OK = {
  data: {
    access_token: "AT",
    refresh_token: "RT",
    expires_in: 1800,
    user: { id_user: 1, nama: "Bu Sari", role: "penyuluh", status_akun: "aktif" },
  },
};

describe("backendBaseUrl", () => {
  it("membuang garis miring di akhir", () => {
    vi.stubEnv("BACKEND_URL", "http://backend.test///");
    expect(backendBaseUrl()).toBe("http://backend.test");
  });
  it("melempar galat bila BACKEND_URL kosong", () => {
    vi.stubEnv("BACKEND_URL", "");
    expect(() => backendBaseUrl()).toThrow("BACKEND_URL belum diisi");
  });
});

describe("galatBackend", () => {
  it("TimeoutError -> 504, lainnya -> 502", () => {
    const t = new Error("x");
    t.name = "TimeoutError";
    expect(galatBackend(t).status).toBe(504);
    expect(galatBackend(new TypeError("x")).status).toBe(502);
    expect(galatBackend("bukan error").code).toBe("JARINGAN_GAGAL");
  });
});

describe("loginBackend", () => {
  it("berhasil: mengembalikan data login tervalidasi dan memanggil /auth/login", async () => {
    fetchMock.mockResolvedValue(json(LOGIN_OK));
    const hasil = await loginBackend({ username: "sari", password: "rahasia123" });
    expect(hasil.ok).toBe(true);
    if (hasil.ok) expect(hasil.data.user.role).toBe("penyuluh");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://backend.test/api/v1/auth/login");
    expect(JSON.parse(init.body as string)).toEqual({ username: "sari", password: "rahasia123" });
  });

  it("kredensial salah: meneruskan kode dan pesan dari amplop error", async () => {
    fetchMock.mockResolvedValue(
      json(
        { error: { code: "KREDENSIAL_SALAH", message: "Username atau kata sandi salah." } },
        401,
      ),
    );
    const hasil = await loginBackend({ username: "x", password: "y" });
    expect(hasil).toMatchObject({
      ok: false,
      status: 401,
      code: "KREDENSIAL_SALAH",
      message: "Username atau kata sandi salah.",
    });
  });

  it("akun terkunci: details ikut diteruskan (sisa_menit)", async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          error: { code: "AKUN_TERKUNCI", message: "Akun terkunci.", details: { sisa_menit: 12 } },
        },
        423,
      ),
    );
    const hasil = await loginBackend({ username: "x", password: "y" });
    expect(hasil).toMatchObject({ ok: false, status: 423, details: { sisa_menit: 12 } });
  });

  it("galat server tanpa amplop kontrak -> SERVER_ERROR", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    expect(await loginBackend({ username: "x", password: "y" })).toMatchObject({
      ok: false,
      code: "SERVER_ERROR",
    });
  });

  it("sukses tetapi bentuk data menyimpang -> RESPON_TIDAK_VALID", async () => {
    fetchMock.mockResolvedValue(json({ data: { access_token: "AT" } }));
    expect(await loginBackend({ username: "x", password: "y" })).toMatchObject({
      ok: false,
      status: 502,
      code: "RESPON_TIDAK_VALID",
    });
  });

  it("jaringan putus -> JARINGAN_GAGAL", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await loginBackend({ username: "x", password: "y" })).toMatchObject({
      ok: false,
      status: 502,
      code: "JARINGAN_GAGAL",
    });
  });
});

describe("refreshAccessToken", () => {
  it("berhasil", async () => {
    fetchMock.mockResolvedValue(json({ data: { access_token: "NEW", expires_in: 1800 } }));
    expect(await refreshAccessToken("RT")).toEqual({ access_token: "NEW", expires_in: 1800 });
  });
  it.each([
    ["status bukan 2xx", () => json({ error: { code: "X", message: "x" } }, 401)],
    ["bentuk data salah", () => json({ data: { nope: 1 } })],
    ["bukan JSON", () => new Response("x", { status: 200 })],
  ])("mengembalikan null bila %s", async (_nama, buat) => {
    fetchMock.mockResolvedValue(buat());
    expect(await refreshAccessToken("RT")).toBeNull();
  });
  it("mengembalikan null bila jaringan putus", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await refreshAccessToken("RT")).toBeNull();
  });
});

describe("auth-cookies", () => {
  function jarPalsu() {
    const set: { name: string; value: string; options: CookieOptions }[] = [];
    const hapus: string[] = [];
    const jar: CookieJar = {
      set: (name, value, options) => set.push({ name, value, options }),
      delete: (name) => hapus.push(name),
    };
    return { jar, set, hapus };
  }

  it("setTokenCookies: kedua cookie httpOnly, SameSite=lax, dengan masa berlaku masing-masing", () => {
    const { jar, set } = jarPalsu();
    setTokenCookies(jar, { access_token: "AT", refresh_token: "RT", expires_in: 1800 });
    expect(set).toEqual([
      {
        name: COOKIE_ACCESS,
        value: "AT",
        options: { httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 1800 },
      },
      {
        name: COOKIE_REFRESH,
        value: "RT",
        options: {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
          maxAge: REFRESH_MAX_AGE_DETIK,
        },
      },
    ]);
  });

  it("flag Secure aktif di production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { jar, set } = jarPalsu();
    setAccessCookie(jar, "AT", 60);
    expect(set[0]?.options.secure).toBe(true);
  });

  it("clearTokenCookies menghapus kedua cookie", () => {
    const { jar, hapus } = jarPalsu();
    clearTokenCookies(jar);
    expect(hapus).toEqual([COOKIE_ACCESS, COOKIE_REFRESH]);
  });
});
