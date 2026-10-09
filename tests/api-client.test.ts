// tests/api-client.test.ts
// lib/api.ts (sisi browser): origin yang sama, tanpa token, galat seragam, validasi Zod.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, getErrorMessage, isApiError, queryKeys } from "@/lib/api";

const fetchMock = vi.fn();
const assign = vi.fn();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const LAHAN = {
  id_lahan: 1,
  nama_lahan: "Sawah Utara",
  lokasi: { lat: -7.6, lon: 111.5 },
  komoditas: "padi",
};

beforeEach(() => {
  fetchMock.mockReset();
  assign.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { location: { pathname: "/dashboard", assign } });
});
afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("memanggil /api/v1 di origin yang sama, tanpa header Authorization", async () => {
    fetchMock.mockResolvedValue(json({ data: [LAHAN] }));
    const lahan = await api.lahan.list();
    expect(lahan[0]?.nama_lahan).toBe("Sawah Utara");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/lahan");
    expect(init.credentials).toBe("same-origin");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("menambahkan query dan melewati nilai undefined", async () => {
    fetchMock.mockImplementation(async () => json({ data: [] })); // Response baru tiap panggilan
    await api.lahan.jadwal(5, "tanam");
    await api.lahan.jadwal(5);
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe("/api/v1/lahan/5/jadwal?aktivitas=tanam");
    expect((fetchMock.mock.calls[1] as [string])[0]).toBe("/api/v1/lahan/5/jadwal");
  });

  it("mengirim body JSON dengan Content-Type pada PATCH", async () => {
    fetchMock.mockResolvedValue(
      json({
        data: { id_rekomendasi: 11, status_validasi: "disetujui", notifikasi_terkirim: true },
      }),
    );
    const hasil = await api.validasi.koreksi(11, { aksi: "setujui" });
    expect(hasil.notifikasi_terkirim).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/rekomendasi/11/koreksi");
    expect(init.method).toBe("PATCH");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ aksi: "setujui" });
  });

  it("amplop error diubah menjadi ApiError berisi kode, pesan, dan details", async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          error: {
            code: "TANGGAL_DI_LUAR_PRAKIRAAN",
            message: "Tanggal terlalu jauh.",
            details: { maks: 9 },
          },
        },
        422,
      ),
    );
    const galat = await api.simulasi
      .waktuTanam({ id_lahan: 1, tanggal_tanam: "2027-01-01" })
      .catch((e: unknown) => e);
    expect(isApiError(galat)).toBe(true);
    expect(galat).toMatchObject({
      code: "TANGGAL_DI_LUAR_PRAKIRAAN",
      status: 422,
      details: { maks: 9 },
    });
    expect(getErrorMessage(galat)).toBe("Tanggal terlalu jauh.");
    expect(assign).not.toHaveBeenCalled();
  });

  it.each(["TIDAK_TERAUTENTIKASI", "TOKEN_KEDALUWARSA"])(
    "%s -> arahkan ke /login",
    async (kode) => {
      fetchMock.mockResolvedValue(json({ error: { code: kode, message: "Sesi berakhir." } }, 401));
      await expect(api.lahan.list()).rejects.toBeInstanceOf(ApiError);
      expect(assign).toHaveBeenCalledWith("/login");
    },
  );

  it("tidak mengulang redirect bila sudah berada di /login", async () => {
    vi.stubGlobal("window", { location: { pathname: "/login", assign } });
    fetchMock.mockResolvedValue(
      json({ error: { code: "TIDAK_TERAUTENTIKASI", message: "x" } }, 401),
    );
    await expect(api.lahan.list()).rejects.toBeInstanceOf(ApiError);
    expect(assign).not.toHaveBeenCalled();
  });

  it("respons error tanpa amplop kontrak -> SERVER_ERROR", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 500 }));
    await expect(api.lahan.list()).rejects.toMatchObject({ code: "SERVER_ERROR", status: 500 });
  });

  it("data sukses yang menyimpang dari kontrak -> RESPON_TIDAK_VALID", async () => {
    fetchMock.mockResolvedValue(json({ data: [{ id_lahan: "bukan angka" }] }));
    await expect(api.lahan.list()).rejects.toMatchObject({
      code: "RESPON_TIDAK_VALID",
      status: 502,
    });
  });

  it("fetch gagal -> JARINGAN_GAGAL; AbortError dilempar apa adanya", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(api.lahan.list()).rejects.toMatchObject({ code: "JARINGAN_GAGAL" });

    const abort = new DOMException("dibatalkan", "AbortError");
    fetchMock.mockRejectedValueOnce(abort);
    await expect(api.lahan.list()).rejects.toBe(abort);
  });

  it("getErrorMessage memberi pesan umum untuk error non-ApiError", () => {
    expect(getErrorMessage(new Error("internal"))).toBe(
      "Terjadi kesalahan tak terduga. Coba lagi.",
    );
  });

  it("endpoint lain memakai path dan metode yang benar", async () => {
    fetchMock.mockImplementation(async () => json({ data: [] }));
    await api.musimTanam.list(5);
    await api.notifikasi.baca(3).catch(() => undefined);
    await api.notifikasi.list({ dibaca: false, page: 2 }).catch(() => undefined);
    const urls = fetchMock.mock.calls.map((c) => (c as [string, RequestInit])[0]);
    expect(urls).toEqual([
      "/api/v1/lahan/5/musim-tanam",
      "/api/v1/notifikasi/3/baca",
      "/api/v1/notifikasi?dibaca=false&page=2",
    ]);
  });

  it("queryKeys stabil", () => {
    expect(queryKeys.jadwal(5)).toEqual(["lahan", 5, "jadwal", "semua"]);
    expect(queryKeys.antreanValidasi).toEqual(["rekomendasi", "antrean-validasi"]);
  });
});
