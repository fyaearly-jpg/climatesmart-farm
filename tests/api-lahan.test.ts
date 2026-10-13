// tests/api-lahan.test.ts
// Endpoint tambah, ubah, hapus lahan di API client (KONTRAK bagian 4).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const LAHAN = {
  id_lahan: 9,
  nama_lahan: "Sawah Selatan",
  lokasi: { lat: -7.63, lon: 111.52 },
  komoditas: "padi",
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { location: { pathname: "/dashboard", assign: vi.fn() } });
});
afterEach(() => vi.unstubAllGlobals());

describe("api.lahan", () => {
  it("create: POST /lahan dengan isi sesuai KONTRAK", async () => {
    fetchMock.mockImplementation(async () => json({ data: LAHAN }, 201));
    const hasil = await api.lahan.create({
      nama_lahan: "Sawah Selatan",
      lokasi: { lat: -7.63, lon: 111.52 },
    });
    expect(hasil.id_lahan).toBe(9);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/lahan");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      nama_lahan: "Sawah Selatan",
      lokasi: { lat: -7.63, lon: 111.52 },
    });
  });

  it("update: PATCH /lahan/{id}", async () => {
    fetchMock.mockImplementation(async () => json({ data: { ...LAHAN, nama_lahan: "Baru" } }));
    const hasil = await api.lahan.update(9, { nama_lahan: "Baru" });
    expect(hasil.nama_lahan).toBe("Baru");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/lahan/9");
    expect(init.method).toBe("PATCH");
  });

  it("remove: DELETE /lahan/{id} menerima 204 tanpa isi dan mengembalikan undefined", async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }));
    await expect(api.lahan.remove(9)).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/lahan/9");
    expect(init.method).toBe("DELETE");
  });

  it("remove: galat 403 dari backend dilempar sebagai ApiError", async () => {
    fetchMock.mockImplementation(async () =>
      json({ error: { code: "AKSES_DITOLAK", message: "Lahan ini bukan milik Anda." } }, 403),
    );
    await expect(api.lahan.remove(9)).rejects.toMatchObject({ code: "AKSES_DITOLAK", status: 403 });
  });

  it("create: respons yang menyimpang dari KONTRAK ditolak", async () => {
    fetchMock.mockImplementation(async () =>
      json({ data: { ...LAHAN, komoditas: "jagung" } }, 201),
    );
    await expect(
      api.lahan.create({ nama_lahan: "Sawah Selatan", lokasi: { lat: -7.63, lon: 111.52 } }),
    ).rejects.toMatchObject({ code: "RESPON_TIDAK_VALID" });
  });
});
