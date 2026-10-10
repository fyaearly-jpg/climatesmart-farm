// tests/actions-flask.test.ts
// Server action login/register/logout yang memakai backend Flask (fetch dimock).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => ({
  set: [] as { name: string; value: string; options: Record<string, unknown> }[],
  deleted: [] as string[],
}));
const sesi = vi.hoisted(() => ({ start: vi.fn(), end: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: (name: string, value: string, options: Record<string, unknown>) =>
      jar.set.push({ name, value, options }),
    delete: (name: string) => jar.deleted.push(name),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/session", () => ({
  startSession: sesi.start,
  endSession: sesi.end,
  getSession: async () => null,
}));

import { loginAction, logoutAction, registerAction } from "@/lib/actions";

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const galat = (code: string, message: string, status: number, details?: Record<string, unknown>) =>
  json({ error: { code, message, ...(details ? { details } : {}) } }, status);

const LOGIN_OK = {
  data: {
    access_token: "AT",
    refresh_token: "RT",
    expires_in: 1800,
    user: { id_user: 12, nama: "Pak Subur", role: "petani", status_akun: "aktif" },
  },
};

function form(isi: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(isi)) f.set(k, v);
  return f;
}

/** Jalankan action dan kembalikan tujuan redirect-nya. */
async function tujuan(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    const m = /^REDIRECT:(.*)$/.exec((e as Error).message);
    if (m?.[1] !== undefined) return m[1];
    throw e;
  }
  throw new Error("action tidak melakukan redirect");
}
const pesanDari = (url: string) => decodeURIComponent(url.split("error=")[1] ?? "");

const DAFTAR = {
  nama: "Subur Waluyo",
  username: "pak_subur",
  email: "subur@mail.com",
  password: "rahasia123",
  no_whatsapp: "0812 3456 7890",
  nama_lahan: "Sawah Utara",
  lat: "-7,6298",
  lon: "111.5239",
};

beforeEach(() => {
  vi.stubEnv("BACKEND_URL", "http://backend.test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  sesi.start.mockReset();
  sesi.end.mockReset();
  jar.set.length = 0;
  jar.deleted.length = 0;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("loginAction", () => {
  it("berhasil: token ke cookie httpOnly, sesi dimulai dengan peran dan nama, redirect ke /dashboard", async () => {
    fetchMock.mockResolvedValue(json(LOGIN_OK));
    expect(await tujuan(loginAction(form({ username: "pak_subur", password: "rahasia123" })))).toBe(
      "/dashboard",
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://backend.test/api/v1/auth/login");
    expect(JSON.parse(init.body as string)).toEqual({
      username: "pak_subur",
      password: "rahasia123",
    });
    expect(jar.set.map((c) => c.name)).toEqual(["csf_at", "csf_rt"]);
    expect(jar.set.every((c) => c.options.httpOnly === true)).toBe(true);
    expect(sesi.start).toHaveBeenCalledWith({ role: "petani", name: "Pak Subur" });
  });

  it("username atau password kosong: tidak memanggil backend", async () => {
    const url = await tujuan(loginAction(form({ username: "", password: "x" })));
    expect(url).toMatch(/^\/login\?error=/);
    expect(pesanDari(url)).toBe("Username dan kata sandi wajib diisi.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("kredensial salah: pesan dari backend, tanpa cookie dan tanpa sesi", async () => {
    fetchMock.mockResolvedValue(galat("KREDENSIAL_SALAH", "Username atau kata sandi salah.", 401));
    const url = await tujuan(loginAction(form({ username: "x", password: "y" })));
    expect(pesanDari(url)).toBe("Username atau kata sandi salah.");
    expect(jar.set).toHaveLength(0);
    expect(sesi.start).not.toHaveBeenCalled();
  });

  it("akun terkunci: menampilkan sisa menit", async () => {
    fetchMock.mockResolvedValue(galat("AKUN_TERKUNCI", "Akun terkunci.", 423, { sisa_menit: 12 }));
    const url = await tujuan(loginAction(form({ username: "x", password: "y" })));
    expect(pesanDari(url)).toBe("Akun terkunci. Coba lagi dalam 12 menit.");
  });

  it("backend mati: pesan jaringan, bukan galat mentah", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const url = await tujuan(loginAction(form({ username: "x", password: "y" })));
    expect(pesanDari(url)).toBe("Tidak dapat terhubung ke server. Coba lagi nanti.");
  });
});

describe("registerAction", () => {
  it("berhasil: register lalu login otomatis, payload sesuai KONTRAK", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ data: { id_user: 12, role: "petani", status_akun: "aktif", id_lahan: 5 } }, 201),
      )
      .mockResolvedValueOnce(json(LOGIN_OK));

    expect(await tujuan(registerAction(form(DAFTAR)))).toBe("/dashboard");

    const [urlDaftar, initDaftar] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(urlDaftar).toBe("http://backend.test/api/v1/auth/register");
    expect(JSON.parse(initDaftar.body as string)).toEqual({
      nama: "Subur Waluyo",
      username: "pak_subur",
      email: "subur@mail.com",
      password: "rahasia123",
      no_whatsapp: "081234567890", // spasi dibuang
      lahan: { nama_lahan: "Sawah Utara", lokasi: { lat: -7.6298, lon: 111.5239 } }, // koma desimal diterima
    });
    expect((fetchMock.mock.calls[1] as [string])[0]).toBe("http://backend.test/api/v1/auth/login");
    expect(jar.set.map((c) => c.name)).toEqual(["csf_at", "csf_rt"]);
    expect(sesi.start).toHaveBeenCalledWith({ role: "petani", name: "Pak Subur" });
  });

  it("mengabaikan role=admin dari form: payload tidak memuat role, peran sesi dari Flask", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ data: { id_user: 12, role: "petani", status_akun: "aktif" } }, 201),
      )
      .mockResolvedValueOnce(json(LOGIN_OK));

    expect(await tujuan(registerAction(form({ ...DAFTAR, role: "admin" })))).toBe("/dashboard");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).not.toHaveProperty("role");
    expect(sesi.start).toHaveBeenCalledWith({ role: "petani", name: "Pak Subur" });
  });

  it.each([
    ["latitude kosong", { lat: "" }, "Latitude wajib berupa angka, contoh -7.6298"],
    ["latitude di luar rentang", { lat: "95" }, "Latitude harus antara -90 dan 90"],
    ["longitude bukan angka", { lon: "abc" }, "Longitude wajib berupa angka, contoh 111.5239"],
    [
      "kata sandi tanpa angka",
      { password: "rahasiasaja" },
      "Kata sandi harus mengandung minimal 1 angka",
    ],
    ["email tidak valid", { email: "bukan-email" }, "Format email tidak valid"],
    [
      "nomor WhatsApp tidak valid",
      { no_whatsapp: "123" },
      "Nomor WhatsApp tidak valid (contoh 081234567890)",
    ],
  ])("menolak %s sebelum menyentuh backend", async (_nama, ubah, pesan) => {
    const url = await tujuan(registerAction(form({ ...DAFTAR, ...ubah })));
    expect(url).toMatch(/^\/register\?error=/);
    expect(pesanDari(url)).toBe(pesan);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("username atau email sudah dipakai (DUPLIKAT)", async () => {
    fetchMock.mockResolvedValue(galat("DUPLIKAT", "Username atau email sudah dipakai.", 409));
    const url = await tujuan(registerAction(form(DAFTAR)));
    expect(url).toMatch(/^\/register\?error=/);
    expect(pesanDari(url)).toBe("Username atau email sudah dipakai.");
    expect(sesi.start).not.toHaveBeenCalled();
  });

  it("VALIDASI_GAGAL dari backend: menampilkan pesan field pertama", async () => {
    fetchMock.mockResolvedValue(
      galat("VALIDASI_GAGAL", "Input tidak valid.", 422, {
        username: "Username minimal 3 karakter.",
      }),
    );
    const url = await tujuan(registerAction(form(DAFTAR)));
    expect(pesanDari(url)).toBe("Username minimal 3 karakter.");
  });

  it("daftar berhasil tetapi login otomatis gagal: arahkan ke /login dengan penjelasan", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ data: { id_user: 12, role: "petani", status_akun: "aktif" } }, 201),
      )
      .mockResolvedValueOnce(galat("SERVER_ERROR", "Kesalahan.", 500));
    const url = await tujuan(registerAction(form(DAFTAR)));
    expect(url).toMatch(/^\/login\?error=/);
    expect(pesanDari(url)).toContain("Pendaftaran berhasil");
    expect(sesi.start).not.toHaveBeenCalled();
  });
});

describe("logoutAction", () => {
  it("menghapus cookie token dan sesi, lalu ke /login", async () => {
    expect(await tujuan(logoutAction())).toBe("/login");
    expect(jar.deleted).toEqual(["csf_at", "csf_rt"]);
    expect(sesi.end).toHaveBeenCalledTimes(1);
  });
});
