// tests/backend-register.test.ts
// registerBackend dan pesanGalatPengguna (lib/backend.ts).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { galatBackend, loginBackend, pesanGalatPengguna, registerBackend } from "@/lib/backend";

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const INPUT = {
  nama: "Subur Waluyo",
  username: "pak_subur",
  email: "subur@mail.com",
  password: "rahasia123",
  no_whatsapp: "081234567890",
  lahan: { nama_lahan: "Sawah Utara", lokasi: { lat: -7.6298, lon: 111.5239 } },
};

beforeEach(() => {
  vi.stubEnv("BACKEND_URL", "http://backend.test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("registerBackend", () => {
  it("201: mengembalikan data register tervalidasi", async () => {
    fetchMock.mockResolvedValue(
      json({ data: { id_user: 12, role: "petani", status_akun: "aktif", id_lahan: 5 } }, 201),
    );
    const hasil = await registerBackend(INPUT);
    expect(hasil).toEqual({
      ok: true,
      data: { id_user: 12, role: "petani", status_akun: "aktif", id_lahan: 5 },
    });
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe(
      "http://backend.test/api/v1/auth/register",
    );
  });

  it("409 DUPLIKAT diteruskan", async () => {
    fetchMock.mockResolvedValue(
      json({ error: { code: "DUPLIKAT", message: "Sudah dipakai." } }, 409),
    );
    expect(await registerBackend(INPUT)).toMatchObject({
      ok: false,
      status: 409,
      code: "DUPLIKAT",
    });
  });

  it("bentuk respons menyimpang -> RESPON_TIDAK_VALID", async () => {
    fetchMock.mockResolvedValue(json({ data: { id_user: "bukan angka" } }, 201));
    expect(await registerBackend(INPUT)).toMatchObject({ ok: false, code: "RESPON_TIDAK_VALID" });
  });
});

describe("konfigurasi kosong", () => {
  it("BACKEND_URL kosong -> SERVER_ERROR 500, bukan galat jaringan", async () => {
    vi.stubEnv("BACKEND_URL", "");
    expect(await loginBackend({ username: "x", password: "y" })).toMatchObject({
      ok: false,
      status: 500,
      code: "SERVER_ERROR",
      message: "Konfigurasi server belum lengkap.",
    });
    expect(galatBackend(new Error("lain")).code).toBe("JARINGAN_GAGAL");
  });
});

describe("pesanGalatPengguna", () => {
  const dasar = { code: "X", message: "Pesan dasar.", details: {} };

  it("memakai message untuk galat biasa", () => {
    expect(pesanGalatPengguna(dasar)).toBe("Pesan dasar.");
  });

  it("VALIDASI_GAGAL: pesan field pertama (string atau array)", () => {
    expect(
      pesanGalatPengguna({
        ...dasar,
        code: "VALIDASI_GAGAL",
        details: { email: "Email tidak valid." },
      }),
    ).toBe("Email tidak valid.");
    expect(
      pesanGalatPengguna({
        ...dasar,
        code: "VALIDASI_GAGAL",
        details: { password: ["Terlalu pendek."] },
      }),
    ).toBe("Terlalu pendek.");
  });

  it("VALIDASI_GAGAL tanpa detail yang bisa dibaca -> message", () => {
    expect(pesanGalatPengguna({ ...dasar, code: "VALIDASI_GAGAL", details: { x: 1, y: "" } })).toBe(
      "Pesan dasar.",
    );
  });

  it("AKUN_TERKUNCI: menambahkan sisa menit hanya bila belum disebut", () => {
    expect(
      pesanGalatPengguna({ ...dasar, code: "AKUN_TERKUNCI", details: { sisa_menit: 7 } }),
    ).toBe("Pesan dasar. Coba lagi dalam 7 menit.");
    expect(
      pesanGalatPengguna({
        code: "AKUN_TERKUNCI",
        message: "Coba lagi dalam 7 menit.",
        details: { sisa_menit: 7 },
      }),
    ).toBe("Coba lagi dalam 7 menit.");
    expect(pesanGalatPengguna({ ...dasar, code: "AKUN_TERKUNCI", details: {} })).toBe(
      "Pesan dasar.",
    );
  });
});
