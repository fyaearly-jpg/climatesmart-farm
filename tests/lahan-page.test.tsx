// @vitest-environment jsdom
//
// tests/lahan-page.test.tsx
// Halaman Lahan saya (Client Component): daftar, tambah, ubah, hapus. fetch dimock dengan data berstatus
// supaya muat ulang daftar setelah mutasi benar-benar teruji.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LahanSayaPage from "@/app/dashboard/lahan/page";
import { formatKoordinat, parseAngka } from "@/lib/form";

interface LahanFx {
  id_lahan: number;
  nama_lahan: string;
  lokasi: { lat: number; lon: number };
  komoditas: string;
}
const lahan = (id: number, nama: string, lat = -7.6298, lon = 111.5239): LahanFx => ({
  id_lahan: id,
  nama_lahan: nama,
  lokasi: { lat, lon },
  komoditas: "padi",
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const galat = (status: number, code: string, message: string) =>
  json({ error: { code, message } }, status);

let fetchMock: ReturnType<typeof vi.fn>;
let daftar: LahanFx[];
let tolak: Record<string, Response> = {};
const panggilan = (metode: string) =>
  fetchMock.mock.calls.filter(
    (c) => ((c as [string, RequestInit?])[1]?.method ?? "GET") === metode,
  ) as [string, RequestInit][];

function renderHalaman() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LahanSayaPage />
    </QueryClientProvider>,
  );
}
function stubLokasi(
  getCurrentPosition: (ok: (p: unknown) => void, err: (e: { code: number }) => void) => void,
) {
  Object.defineProperty(window.navigator, "geolocation", {
    value: { getCurrentPosition },
    configurable: true,
  });
}

beforeEach(() => {
  daftar = [lahan(5, "Sawah Utara")];
  tolak = {};
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const metode = init?.method ?? "GET";
    if (tolak[metode]) return tolak[metode].clone();
    if (url === "/api/v1/lahan" && metode === "GET") return json({ data: daftar });
    if (url === "/api/v1/lahan" && metode === "POST") {
      const b = JSON.parse(init?.body as string);
      const baru = { id_lahan: 9, ...b, komoditas: "padi" };
      daftar = [...daftar, baru];
      return json({ data: baru }, 201);
    }
    const id = Number(url.split("/").at(-1));
    if (metode === "PATCH") {
      const b = JSON.parse(init?.body as string);
      daftar = daftar.map((l) => (l.id_lahan === id ? { ...l, ...b } : l));
      return json({ data: daftar.find((l) => l.id_lahan === id) });
    }
    if (metode === "DELETE") {
      daftar = daftar.filter((l) => l.id_lahan !== id);
      return new Response(null, { status: 204 });
    }
    return galat(404, "TIDAK_DITEMUKAN", "x");
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window.navigator, "geolocation");
});

describe("Lahan saya: daftar", () => {
  it("menampilkan nama, koordinat, dan tautan peta setiap lahan", async () => {
    daftar = [lahan(5, "Sawah Utara"), lahan(6, "Sawah Selatan", -7.63, 111.52)];
    renderHalaman();
    expect(await screen.findByRole("heading", { name: "Sawah Utara" })).toBeTruthy();
    expect(screen.getByText(/-7\.62980, 111\.52390/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Sawah Selatan" })).toBeTruthy();
    const peta = screen
      .getAllByRole("link", { name: /Lihat di peta/ })
      .map((a) => a.getAttribute("href"));
    expect(peta).toEqual([
      "https://www.google.com/maps?q=-7.6298,111.5239",
      "https://www.google.com/maps?q=-7.63,111.52",
    ]);
    expect(screen.getAllByRole("link", { name: /Lihat di peta/ })[0]?.getAttribute("rel")).toBe(
      "noopener noreferrer",
    );
  });

  it("tanpa lahan menampilkan ajakan menambah", async () => {
    daftar = [];
    renderHalaman();
    expect(await screen.findByText(/belum punya lahan/)).toBeTruthy();
  });

  it("galat memuat: pesan dari backend dan tombol coba lagi yang memuat ulang", async () => {
    const user = userEvent.setup();
    tolak = { GET: galat(500, "SERVER_ERROR", "Lahan gagal dimuat.") };
    renderHalaman();
    expect(await screen.findByText("Lahan gagal dimuat.")).toBeTruthy();
    tolak = {};
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(await screen.findByRole("heading", { name: "Sawah Utara" })).toBeTruthy();
  });
});

describe("Lahan saya: tambah", () => {
  it("menolak isian tidak valid tanpa memanggil backend", async () => {
    const user = userEvent.setup();
    renderHalaman();
    await screen.findByRole("heading", { name: "Sawah Utara" });
    await user.type(screen.getByLabelText("Nama lahan"), "ab");
    await user.type(screen.getByLabelText("Latitude"), "95");
    await user.click(screen.getByRole("button", { name: "Tambah lahan" }));

    expect(await screen.findByText("Nama lahan minimal 3 karakter")).toBeTruthy();
    expect(screen.getByText("Latitude harus antara -90 dan 90")).toBeTruthy();
    expect(screen.getByText("Longitude wajib berupa angka, contoh 111.5239")).toBeTruthy();
    expect(panggilan("POST")).toHaveLength(0);
  });

  it("menyimpan: koma desimal diterima, POST sesuai KONTRAK, daftar dimuat ulang, form dikosongkan", async () => {
    const user = userEvent.setup();
    renderHalaman();
    await screen.findByRole("heading", { name: "Sawah Utara" });
    await user.type(screen.getByLabelText("Nama lahan"), "  Sawah Selatan ");
    await user.type(screen.getByLabelText("Latitude"), "-7,63");
    await user.type(screen.getByLabelText("Longitude"), "111.52");
    await user.click(screen.getByRole("button", { name: "Tambah lahan" }));

    expect(await screen.findByText('Lahan "Sawah Selatan" ditambahkan.')).toBeTruthy();
    const [url, init] = panggilan("POST")[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/lahan");
    expect(JSON.parse(init.body as string)).toEqual({
      nama_lahan: "Sawah Selatan",
      lokasi: { lat: -7.63, lon: 111.52 },
    });
    expect(await screen.findByRole("heading", { name: "Sawah Selatan" })).toBeTruthy();
    expect((screen.getByLabelText("Nama lahan") as HTMLInputElement).value).toBe("");
  });

  it("galat dari backend ditampilkan di formulir", async () => {
    const user = userEvent.setup();
    tolak = { POST: galat(422, "VALIDASI_GAGAL", "Nama lahan sudah dipakai.") };
    renderHalaman();
    await screen.findByRole("heading", { name: "Sawah Utara" });
    await user.type(screen.getByLabelText("Nama lahan"), "Sawah Utara");
    await user.type(screen.getByLabelText("Latitude"), "-7.6");
    await user.type(screen.getByLabelText("Longitude"), "111.5");
    await user.click(screen.getByRole("button", { name: "Tambah lahan" }));
    expect(await screen.findByText("Nama lahan sudah dipakai.")).toBeTruthy();
  });
});

describe("Lahan saya: lokasi perangkat", () => {
  it("tanpa dukungan geolokasi, tombol tidak ditampilkan", async () => {
    renderHalaman();
    await screen.findByRole("heading", { name: "Sawah Utara" });
    expect(screen.queryByRole("button", { name: "Pakai lokasi saya" })).toBeNull();
  });

  it("mengisi latitude dan longitude dari lokasi perangkat", async () => {
    const user = userEvent.setup();
    stubLokasi((ok) => ok({ coords: { latitude: -7.629812345, longitude: 111.523987654 } }));
    renderHalaman();
    await user.click(await screen.findByRole("button", { name: "Pakai lokasi saya" }));
    expect((screen.getByLabelText("Latitude") as HTMLInputElement).value).toBe("-7.629812");
    expect((screen.getByLabelText("Longitude") as HTMLInputElement).value).toBe("111.523988");
    expect(screen.getByText(/Koordinat terisi dari lokasi perangkat/)).toBeTruthy();
  });

  it.each([
    [1, /Izin lokasi ditolak/],
    [2, /Lokasi perangkat tidak tersedia/],
    [3, /terlalu lama/],
    [99, /Lokasi tidak dapat diambil/],
  ])("galat lokasi kode %s menampilkan pesan yang sesuai", async (kode, pola) => {
    const user = userEvent.setup();
    stubLokasi((_ok, err) => err({ code: kode }));
    renderHalaman();
    await user.click(await screen.findByRole("button", { name: "Pakai lokasi saya" }));
    expect(await screen.findByText(pola)).toBeTruthy();
    expect((screen.getByLabelText("Latitude") as HTMLInputElement).value).toBe("");
  });
});

describe("Lahan saya: ubah", () => {
  it("memuat nilai awal, mengirim PATCH, lalu menampilkan hasilnya", async () => {
    const user = userEvent.setup();
    renderHalaman();
    await user.click(await screen.findByRole("button", { name: "Ubah Sawah Utara" }));

    const kartu = screen
      .getByRole("heading", { name: "Ubah lahan" })
      .closest("article") as HTMLElement;
    const nama = within(kartu).getByLabelText("Nama lahan") as HTMLInputElement;
    expect(nama.value).toBe("Sawah Utara");
    expect((within(kartu).getByLabelText("Latitude") as HTMLInputElement).value).toBe("-7.6298");

    await user.clear(nama);
    await user.type(nama, "Sawah Barat");
    await user.click(within(kartu).getByRole("button", { name: "Simpan perubahan" }));

    expect(await screen.findByText('Lahan "Sawah Barat" diperbarui.')).toBeTruthy();
    const [url, init] = panggilan("PATCH")[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/lahan/5");
    expect(JSON.parse(init.body as string)).toEqual({
      nama_lahan: "Sawah Barat",
      lokasi: { lat: -7.6298, lon: 111.5239 },
    });
    expect(await screen.findByRole("heading", { name: "Sawah Barat" })).toBeTruthy();
  });

  it("Batal menutup formulir tanpa memanggil backend", async () => {
    const user = userEvent.setup();
    renderHalaman();
    await user.click(await screen.findByRole("button", { name: "Ubah Sawah Utara" }));
    const kartu = screen
      .getByRole("heading", { name: "Ubah lahan" })
      .closest("article") as HTMLElement;
    await user.click(within(kartu).getByRole("button", { name: "Batal" }));
    expect(screen.queryByRole("heading", { name: "Ubah lahan" })).toBeNull();
    expect(panggilan("PATCH")).toHaveLength(0);
  });

  it("galat dari backend saat menyimpan perubahan ditampilkan", async () => {
    const user = userEvent.setup();
    tolak = { PATCH: galat(403, "AKSES_DITOLAK", "Lahan ini bukan milik Anda.") };
    renderHalaman();
    await user.click(await screen.findByRole("button", { name: "Ubah Sawah Utara" }));
    const kartu = screen
      .getByRole("heading", { name: "Ubah lahan" })
      .closest("article") as HTMLElement;
    await user.click(within(kartu).getByRole("button", { name: "Simpan perubahan" }));
    expect(await within(kartu).findByText("Lahan ini bukan milik Anda.")).toBeTruthy();
  });
});

describe("Lahan saya: hapus", () => {
  it("meminta konfirmasi, lalu DELETE dan daftar dimuat ulang", async () => {
    const user = userEvent.setup();
    daftar = [lahan(5, "Sawah Utara"), lahan(6, "Sawah Selatan")];
    renderHalaman();
    await user.click(await screen.findByRole("button", { name: "Hapus Sawah Selatan" }));
    expect(
      screen.getByText(/Hapus lahan Sawah Selatan\? Tindakan ini tidak dapat dibatalkan/),
    ).toBeTruthy();
    expect(panggilan("DELETE")).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Ya, hapus" }));
    expect(await screen.findByText("Lahan dihapus.")).toBeTruthy();
    expect(panggilan("DELETE")[0]?.[0]).toBe("/api/v1/lahan/6");
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Sawah Selatan" })).toBeNull(),
    );
    expect(screen.getByRole("heading", { name: "Sawah Utara" })).toBeTruthy();
  });

  it("Batal tidak menghapus", async () => {
    const user = userEvent.setup();
    renderHalaman();
    await user.click(await screen.findByRole("button", { name: "Hapus Sawah Utara" }));
    await user.click(screen.getByRole("button", { name: "Batal" }));
    expect(screen.queryByText(/Tindakan ini tidak dapat dibatalkan/)).toBeNull();
    expect(panggilan("DELETE")).toHaveLength(0);
  });

  it("galat dari backend saat menghapus ditampilkan dan lahan tetap ada", async () => {
    const user = userEvent.setup();
    tolak = { DELETE: galat(403, "AKSES_DITOLAK", "Lahan ini bukan milik Anda.") };
    renderHalaman();
    await user.click(await screen.findByRole("button", { name: "Hapus Sawah Utara" }));
    await user.click(screen.getByRole("button", { name: "Ya, hapus" }));
    expect(await screen.findByText("Lahan ini bukan milik Anda.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Sawah Utara" })).toBeTruthy();
  });

  it("membuka ubah menutup konfirmasi hapus, dan sebaliknya", async () => {
    const user = userEvent.setup();
    renderHalaman();
    await user.click(await screen.findByRole("button", { name: "Hapus Sawah Utara" }));
    expect(screen.getByText(/Tindakan ini tidak dapat dibatalkan/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ubah Sawah Utara" }));
    expect(screen.queryByText(/Tindakan ini tidak dapat dibatalkan/)).toBeNull();
    expect(screen.getByRole("heading", { name: "Ubah lahan" })).toBeTruthy();
  });
});

describe("pembantu formulir", () => {
  it.each([
    ["-7,6298", -7.6298],
    ["-7.6298", -7.6298],
    ["  111.5239 ", 111.5239],
    ["0", 0],
  ])("parseAngka(%j) = %s", (masukan, hasil) => {
    expect(parseAngka(masukan)).toBe(hasil);
  });

  it.each(["", "abc", "1e3", "0x10", "7..6", "--7", "7,6,2"])("parseAngka(%j) = NaN", (masukan) => {
    expect(Number.isNaN(parseAngka(masukan))).toBe(true);
  });

  it("formatKoordinat memakai titik desimal, lintang lalu bujur", () => {
    expect(formatKoordinat(-7.6298, 111.5239)).toBe("-7.62980, 111.52390");
  });
});
