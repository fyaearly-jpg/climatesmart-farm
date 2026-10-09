// @vitest-environment jsdom
//
// tests/validasi-page.test.tsx
// Halaman validasi sekarang Client Component (useState + TanStack Query), jadi TIDAK bisa
// dipanggil sebagai fungsi biasa seperti Server Component (`render(await ValidasiPage())`).
// Harus dirender sebagai elemen di dalam QueryClientProvider, dengan `fetch` dimock
// mengikuti bentuk respons KONTRAK API v1.0.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ValidasiPage from "@/app/dashboard/validasi/page";

const ANTREAN = [
  {
    prioritas: 1,
    id_rekomendasi: 11,
    lahan: { id_lahan: 1, nama_lahan: "Sawah Utara", pemilik: "Pak Budi" },
    jenis: "penyakit",
    kode: "blas",
    nama: "Blas",
    tingkat: "tinggi",
    skor: 0.82,
    fase: "vegetatif",
    alasan: ["Kelembapan udara di atas 90% selama 14 jam"],
    saran_diajukan: ["Kurangi pemupukan nitrogen"],
    mulai_menunggu: "2026-10-09T06:00:00+07:00",
    batas_validasi: "2026-10-10T06:00:00+07:00",
    sisa_menit: 120,
    mendesak: true,
  },
  {
    prioritas: 2,
    id_rekomendasi: 12,
    lahan: { id_lahan: 2, nama_lahan: "Sawah Selatan", pemilik: "Bu Sari" },
    jenis: "hama",
    kode: "wereng_coklat",
    nama: "Wereng coklat",
    tingkat: "sedang",
    skor: 0.55,
    fase: "awal",
    alasan: ["Suhu hangat dan lembap"],
    saran_diajukan: [],
    mulai_menunggu: "2026-10-09T06:00:00+07:00",
    batas_validasi: "2026-10-10T06:00:00+07:00",
    sisa_menit: 900,
    mendesak: false,
  },
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function renderHalaman() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ValidasiPage />
    </QueryClientProvider>,
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("halaman peran khusus: validasi/page", () => {
  it("menampilkan rekomendasi yang menunggu validasi", async () => {
    fetchMock.mockResolvedValue(json({ data: ANTREAN }));
    renderHalaman();

    expect(await screen.findByText(/Sawah Utara/)).toBeTruthy();
    expect(screen.getByText(/Sawah Selatan/)).toBeTruthy();
    expect(screen.getByText("2 menunggu, 1 mendesak")).toBeTruthy();
    // Badge "Mendesak" hanya untuk yang tinggi dan sisa < 360 menit.
    expect(screen.getAllByText("Mendesak")).toHaveLength(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/rekomendasi/antrean-validasi");
    expect(init.method).toBe("GET");
  });

  it("menampilkan keadaan kosong", async () => {
    fetchMock.mockResolvedValue(json({ data: [] }));
    renderHalaman();
    expect(await screen.findByText(/Tidak ada rekomendasi yang menunggu validasi/)).toBeTruthy();
  });

  it("menampilkan pesan error dari amplop error kontrak", async () => {
    fetchMock.mockResolvedValue(
      json(
        { error: { code: "AKSES_DITOLAK", message: "Hanya penyuluh yang dapat membuka antrean." } },
        403,
      ),
    );
    renderHalaman();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Hanya penyuluh yang dapat membuka antrean.",
    );
  });

  it("mengirim koreksi 'ubah' lewat PATCH setelah validasi formulir lolos", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return json({
          data: { id_rekomendasi: 11, status_validasi: "diubah", notifikasi_terkirim: true },
        });
      }
      return json({ data: ANTREAN });
    });
    renderHalaman();

    const [tombolPertama] = await screen.findAllByRole("button", { name: "Tinjau dan koreksi" });
    if (!tombolPertama) throw new Error("Tombol tinjau tidak ditemukan");
    await user.click(tombolPertama);
    await user.click(await screen.findByRole("radio", { name: /Ubah/ }));

    // Saran dikosongkan -> validasi gagal, tidak ada PATCH.
    await user.clear(screen.getByLabelText("Saran baru untuk petani"));
    await user.click(screen.getByRole("button", { name: "Simpan koreksi" }));
    expect(await screen.findByText("Saran baru wajib diisi untuk aksi ubah")).toBeTruthy();
    expect(
      fetchMock.mock.calls.some(([, i]) => (i as RequestInit | undefined)?.method === "PATCH"),
    ).toBe(false);

    // Saran diisi -> PATCH terkirim dengan payload sesuai kontrak.
    await user.type(
      screen.getByLabelText("Saran baru untuk petani"),
      "Semprot fungisida sesuai anjuran",
    );
    await user.click(screen.getByRole("button", { name: "Simpan koreksi" }));

    await waitFor(() => expect(screen.getByText(/saran sudah dikirim ke petani/)).toBeTruthy());
    const patch = fetchMock.mock.calls.find(
      ([, i]) => (i as RequestInit | undefined)?.method === "PATCH",
    );
    if (!patch) throw new Error("PATCH koreksi tidak terkirim");
    expect(patch[0]).toBe("/api/v1/rekomendasi/11/koreksi");
    expect(JSON.parse((patch[1] as RequestInit).body as string)).toEqual({
      aksi: "ubah",
      tingkat: "tinggi",
      saran: ["Semprot fungisida sesuai anjuran"],
    });
  });
});
