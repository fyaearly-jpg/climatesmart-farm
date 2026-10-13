// @vitest-environment jsdom
//
// tests/musim-tanam-page.test.tsx
// Halaman musim tanam (Client Component): dirender di dalam QueryClientProvider, fetch dimock.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MusimTanamPage from "@/app/dashboard/musim-tanam/page";
import { hariIniJakarta, tambahHari } from "@/lib/date";

const LAHAN = [
  {
    id_lahan: 5,
    nama_lahan: "Sawah Utara",
    lokasi: { lat: -7.6298, lon: 111.5239 },
    komoditas: "padi",
  },
];
const AKTIF = {
  id_musim_tanam: 301,
  id_lahan: 5,
  tanggal_tanam: "2026-09-26",
  varietas: "Inpari 32",
  hst: 14,
  fase: "awal",
  aktif: true,
};
const LAMA = {
  id_musim_tanam: 290,
  id_lahan: 5,
  tanggal_tanam: "2026-03-01",
  varietas: "Ciherang",
  hst: 223,
  fase: "generatif",
  aktif: false,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;
let daftarMusim: unknown[];

function renderHalaman() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MusimTanamPage />
    </QueryClientProvider>,
  );
}
const posts = () =>
  fetchMock.mock.calls.filter(([, i]) => (i as RequestInit | undefined)?.method === "POST");

beforeEach(() => {
  daftarMusim = [AKTIF, LAMA];
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/v1/lahan") return json({ data: LAHAN });
    if (url === "/api/v1/lahan/5/musim-tanam" && init?.method === "POST") {
      const b = JSON.parse(init.body as string);
      return json(
        { data: { id_musim_tanam: 302, id_lahan: 5, ...b, hst: 0, fase: "awal", aktif: true } },
        201,
      );
    }
    if (url === "/api/v1/lahan/5/musim-tanam") return json({ data: daftarMusim });
    return json({ error: { code: "TIDAK_DITEMUKAN", message: "x" } }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("halaman musim tanam", () => {
  it("menampilkan musim aktif dengan timeline HST dan fase, serta riwayat", async () => {
    renderHalaman();
    expect(await screen.findByText(/Hari ke-14/)).toBeTruthy();
    expect(screen.getByText(/Ditanam 26 September 2026/)).toBeTruthy();
    expect(screen.getAllByText(/Inpari 32/)).toHaveLength(2); // di timeline dan di catatan akan menjadi riwayat
    expect(screen.getByText(/Ciherang/)).toBeTruthy(); // riwayat
    expect(screen.getByText(/akan menjadi riwayat/)).toBeTruthy();
  });

  it("tanpa musim tanam: ada pesan kosong untuk aktif dan riwayat", async () => {
    daftarMusim = [];
    renderHalaman();
    expect(await screen.findByText(/Belum ada musim tanam aktif/)).toBeTruthy();
    expect(screen.getByText("Belum ada riwayat musim tanam.")).toBeTruthy();
  });

  it("tanpa lahan: meminta menambah lahan dan tidak menampilkan formulir", async () => {
    fetchMock.mockImplementation(async () => json({ data: [] }));
    renderHalaman();
    expect(await screen.findByText(/belum punya lahan/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Simpan musim tanam" })).toBeNull();
  });

  it("menolak varietas pendek dan tanggal masa depan tanpa memanggil backend", async () => {
    const user = userEvent.setup();
    renderHalaman();
    await screen.findByText(/Hari ke-14/);

    await user.type(screen.getByLabelText("Varietas padi"), "X");
    fireEvent.change(screen.getByLabelText("Tanggal tanam"), {
      target: { value: tambahHari(hariIniJakarta(), 3) },
    });
    await user.click(screen.getByRole("button", { name: "Simpan musim tanam" }));

    expect(await screen.findByText("Varietas minimal 2 karakter")).toBeTruthy();
    expect(screen.getByText(/tidak boleh di masa depan/)).toBeTruthy();
    expect(posts()).toHaveLength(0);
  });

  it("tanggal kosong ditolak dengan pesan wajib diisi", async () => {
    const user = userEvent.setup();
    renderHalaman();
    await screen.findByText(/Hari ke-14/);
    fireEvent.change(screen.getByLabelText("Tanggal tanam"), { target: { value: "" } });
    await user.type(screen.getByLabelText("Varietas padi"), "Inpari 32");
    await user.click(screen.getByRole("button", { name: "Simpan musim tanam" }));
    expect(await screen.findByText("Tanggal tanam wajib diisi.")).toBeTruthy();
    expect(posts()).toHaveLength(0);
  });

  it("menyimpan musim tanam: POST sesuai KONTRAK, pesan berhasil, isian varietas dikosongkan", async () => {
    const user = userEvent.setup();
    renderHalaman();
    await screen.findByText(/Hari ke-14/);

    fireEvent.change(screen.getByLabelText("Tanggal tanam"), { target: { value: "2026-10-05" } });
    await user.type(screen.getByLabelText("Varietas padi"), "  Mekongga ");
    await user.click(screen.getByRole("button", { name: "Simpan musim tanam" }));

    await waitFor(() => expect(screen.getByText(/Tersimpan: Mekongga/)).toBeTruthy());
    const [url, init] = posts()[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/lahan/5/musim-tanam");
    expect(JSON.parse(init.body as string)).toEqual({
      tanggal_tanam: "2026-10-05",
      varietas: "Mekongga",
    });
    expect((screen.getByLabelText("Varietas padi") as HTMLInputElement).value).toBe("");
  });

  it("menampilkan pesan galat dari backend saat simpan gagal", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/v1/lahan") return json({ data: LAHAN });
      if (init?.method === "POST")
        return json(
          { error: { code: "VALIDASI_GAGAL", message: "Tanggal tanam tidak valid." } },
          422,
        );
      return json({ data: [] });
    });
    renderHalaman();
    await screen.findByText(/Belum ada musim tanam aktif/);
    await user.type(screen.getByLabelText("Varietas padi"), "Inpari 32");
    await user.click(screen.getByRole("button", { name: "Simpan musim tanam" }));
    expect(
      (await screen.findAllByRole("alert")).some(
        (a) => a.textContent === "Tanggal tanam tidak valid.",
      ),
    ).toBe(true);
  });

  it("galat memuat musim tanam: ada tombol coba lagi", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/v1/lahan"
        ? json({ data: LAHAN })
        : json({ error: { code: "SERVER_ERROR", message: "Gagal memuat." } }, 500),
    );
    renderHalaman();
    expect(await screen.findByText(/Gagal memuat\./)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeTruthy();
  });
});
