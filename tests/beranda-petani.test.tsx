// @vitest-environment jsdom
//
// tests/beranda-petani.test.tsx
// Beranda Petani (Client Component): cuaca, fase, jadwal, dan prediksi dari API (fetch dimock).

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BerandaPetani } from "@/components/modules/BerandaPetani";
import { formatTanggalPendek } from "@/lib/date";

const lahan = (id: number, nama: string) => ({
  id_lahan: id,
  nama_lahan: nama,
  lokasi: { lat: -7.63, lon: 111.52 },
  komoditas: "padi",
});
const harian = (i: number) => ({
  tanggal: `2026-10-${String(10 + i).padStart(2, "0")}`,
  suhu_min: 24,
  suhu_maks: 31,
  suhu_rata: 27.2,
  kelembapan_rata: 80,
  jam_rh_90: 3,
  curah_hujan_total: i,
  kecepatan_angin_maks: 18,
});
const cuaca = (suhu: number) => ({
  diperbarui: "2026-10-10T08:00:00+07:00",
  terkini: {
    suhu,
    kelembapan_udara: 78,
    curah_hujan: 0.2,
    kecepatan_angin: 11.5,
    suhu_tanah: 27.1,
    kelembapan_tanah: 0.34,
  },
  prakiraan_harian: Array.from({ length: 10 }, (_, i) => harian(i)),
});
const opt = (over: Record<string, unknown>) => ({
  id_rekomendasi: 310,
  kode: "blas",
  nama: "Blas",
  tingkat: "tinggi",
  skor: 0.8,
  alasan: ["Kelembapan ≥ 90% selama 34 jam"],
  pesan_waspada: "Waspada potensi blas, periksa lahan Anda.",
  saran: ["Hindari pemupukan N berlebih"],
  saran_tersedia: false,
  saran_label: null,
  status_validasi: "menunggu",
  catatan_penyuluh: null,
  indikatif: true,
  ...over,
});
const prediksi = (over: Record<string, unknown> = {}) => ({
  id_lahan: 5,
  diperbarui: "2026-10-10T08:00:00+07:00",
  fase: { tanggal_tanam: "2026-09-26", varietas: "Inpari 32", hst: 14, fase: "awal" },
  risiko_cuaca: {
    tingkat: "sedang",
    probabilitas: { rendah: 0.21, sedang: 0.52, tinggi: 0.27 },
    alasan: ["Hujan hari ini 12 mm"],
  },
  jadwal: [
    {
      id_rekomendasi: 302,
      aktivitas: "pemupukan",
      status: "ditunda",
      tanggal: "2026-10-12",
      alasan: ["Risiko hujan sedang"],
      status_validasi: "menunggu",
    },
    {
      id_rekomendasi: 301,
      aktivitas: "penyemprotan",
      status: "direkomendasikan",
      tanggal: "2026-10-10",
      alasan: ["Angin 11 km/jam di bawah batas"],
      status_validasi: "disetujui",
    },
  ],
  penyakit: [
    opt({
      id_rekomendasi: 311,
      kode: "kresek",
      nama: "Hawar daun bakteri (kresek)",
      tingkat: "rendah",
      skor: 0.2,
    }),
    opt({}),
  ],
  hama: [
    opt({
      id_rekomendasi: 312,
      kode: "wereng_coklat",
      nama: "Wereng batang coklat",
      tingkat: "sedang",
      skor: 0.5,
    }),
  ],
  musiman: [
    {
      kode: "penggerek_batang",
      nama: "Penggerek batang",
      pesan: "Musim hujan: kewaspadaan meningkat.",
    },
  ],
  ...over,
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const galat = (status = 500, message = "Gagal memuat.") =>
  json({ error: { code: "SERVER_ERROR", message } }, status);

let fetchMock: ReturnType<typeof vi.fn>;
let rute: Record<string, () => Response>;

function renderHalaman() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BerandaPetani />
    </QueryClientProvider>,
  );
}
const dipanggil = (path: string) =>
  fetchMock.mock.calls.filter((c) => (c as [string])[0] === path).length;

beforeEach(() => {
  rute = {
    "/api/v1/lahan": () => json({ data: [lahan(5, "Sawah Utara")] }),
    "/api/v1/lahan/5/cuaca": () => json({ data: cuaca(28.4) }),
    "/api/v1/lahan/5/prediksi": () => json({ data: prediksi() }),
  };
  fetchMock = vi.fn(async (url: string) =>
    rute[url] ? rute[url]() : galat(404, "Tidak ditemukan."),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Beranda Petani", () => {
  it("menampilkan cuaca terkini dan tabel prakiraan 7 hari", async () => {
    renderHalaman();
    expect(await screen.findByText("Kelembapan Udara")).toBeTruthy();
    expect(screen.getByText("28,4°C")).toBeTruthy();
    expect(screen.getByText("78%")).toBeTruthy();
    expect(screen.getByText("11,5 km/jam")).toBeTruthy();
    expect(screen.getByText("0,34")).toBeTruthy();
    const tabel = screen.getByRole("table", { name: "Prakiraan 7 hari" });
    expect(within(tabel).getAllByRole("row")).toHaveLength(8); // 1 judul kolom + 7 hari, bukan 10
    expect(within(tabel).getByText(formatTanggalPendek("2026-10-10"))).toBeTruthy();
  });

  it("menampilkan fase tumbuh, risiko cuaca, dan peluangnya", async () => {
    renderHalaman();
    expect(await screen.findByText(/Hari ke-14/)).toBeTruthy();
    expect(screen.getByText("Peluang risiko: rendah 21%, sedang 52%, tinggi 27%")).toBeTruthy();
    expect(screen.getByText("Hujan hari ini 12 mm")).toBeTruthy();
  });

  it("menampilkan jadwal terurut tanggal, status, dan penanda menunggu validasi", async () => {
    renderHalaman();
    const panel = (
      await screen.findByRole("heading", { name: "Jadwal Aktivitas (SRI IPB)" })
    ).closest("section") as HTMLElement;
    await within(panel).findByText("Penyemprotan");
    const aktivitas = within(panel)
      .getAllByRole("listitem")
      .filter((li) => li.querySelector("strong"))
      .map((li) => li.querySelector("strong")?.textContent);
    expect(aktivitas).toEqual(["Penyemprotan", "Pemupukan"]); // 10 Okt sebelum 12 Okt
    expect(within(panel).getByText("Disarankan")).toBeTruthy();
    expect(within(panel).getByText("Ditunda")).toBeTruthy();
    expect(within(panel).getAllByText("Menunggu validasi penyuluh.")).toHaveLength(1);
  });

  it("menampilkan hama dan penyakit terurut dari risiko tertinggi, dengan alasan dan musiman", async () => {
    renderHalaman();
    await screen.findByText("Blas");
    const nama = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent)
      .filter((t) => t !== "Risiko cuaca");
    expect(nama).toEqual(["Blas", "Wereng batang coklat", "Hawar daun bakteri (kresek)"]);
    expect(screen.getAllByRole("button", { name: "Lihat alasan" })).toHaveLength(3);
    expect(screen.getByText(/Penggerek batang:/)).toBeTruthy();
    expect(screen.getByText(/Prediksi bersifat indikatif/)).toBeTruthy();
  });

  it("tanpa potensi hama dan penyakit menampilkan pesan aman", async () => {
    rute["/api/v1/lahan/5/prediksi"] = () =>
      json({ data: prediksi({ penyakit: [], hama: [], musiman: [] }) });
    renderHalaman();
    expect(await screen.findByText(/Tidak ada potensi hama atau penyakit/)).toBeTruthy();
  });

  it("tanpa jadwal menampilkan pesan kosong", async () => {
    rute["/api/v1/lahan/5/prediksi"] = () => json({ data: prediksi({ jadwal: [] }) });
    renderHalaman();
    expect(await screen.findByText("Belum ada jadwal aktivitas.")).toBeTruthy();
  });

  it("tanpa musim tanam aktif mengarahkan ke halaman musim tanam", async () => {
    rute["/api/v1/lahan/5/prediksi"] = () => json({ data: prediksi({ fase: null }) });
    renderHalaman();
    const tautan = await screen.findByRole("link", { name: "Catat musim tanam sekarang" });
    expect(tautan.getAttribute("href")).toBe("/dashboard/musim-tanam");
  });

  it("tanpa lahan mengarahkan untuk mendaftarkan lahan", async () => {
    rute["/api/v1/lahan"] = () => json({ data: [] });
    renderHalaman();
    const tautan = await screen.findByRole("link", { name: "Daftarkan lahan" });
    expect(tautan.getAttribute("href")).toBe("/dashboard/lahan");
    expect(dipanggil("/api/v1/lahan/5/cuaca")).toBe(0);
  });

  it("galat memuat lahan menampilkan pesan dan tombol coba lagi yang memuat ulang", async () => {
    const user = userEvent.setup();
    let panggilan = 0;
    rute["/api/v1/lahan"] = () =>
      ++panggilan === 1
        ? galat(500, "Lahan gagal dimuat.")
        : json({ data: [lahan(5, "Sawah Utara")] });
    renderHalaman();
    expect(await screen.findByText("Lahan gagal dimuat.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(await screen.findByText("Kelembapan Udara")).toBeTruthy();
  });

  it("galat cuaca tidak menjatuhkan panel lain; coba lagi hanya mengulang cuaca", async () => {
    const user = userEvent.setup();
    let panggilan = 0;
    rute["/api/v1/lahan/5/cuaca"] = () =>
      ++panggilan === 1 ? galat(500, "Cuaca belum tersedia.") : json({ data: cuaca(30) });
    renderHalaman();
    expect(await screen.findByText("Cuaca belum tersedia.")).toBeTruthy();
    expect(await screen.findByText("Blas")).toBeTruthy(); // prediksi tetap tampil
    await user.click(within(screen.getByRole("alert")).getByRole("button", { name: "Coba lagi" }));
    expect(await screen.findByText("30°C")).toBeTruthy();
    expect(dipanggil("/api/v1/lahan/5/prediksi")).toBe(1);
  });

  it("dengan dua lahan: pilihan lahan memuat cuaca dan prediksi lahan itu", async () => {
    const user = userEvent.setup();
    rute["/api/v1/lahan"] = () =>
      json({ data: [lahan(5, "Sawah Utara"), lahan(6, "Sawah Selatan")] });
    rute["/api/v1/lahan/6/cuaca"] = () => json({ data: cuaca(31.2) });
    rute["/api/v1/lahan/6/prediksi"] = () =>
      json({ data: prediksi({ id_lahan: 6, fase: null, penyakit: [], hama: [] }) });
    renderHalaman();
    await screen.findByText("28,4°C");

    await user.selectOptions(screen.getByLabelText("Lahan aktif"), "6");
    expect(await screen.findByText("31,2°C")).toBeTruthy();
    expect(await screen.findByRole("link", { name: "Catat musim tanam sekarang" })).toBeTruthy();
    expect(dipanggil("/api/v1/lahan/6/prediksi")).toBe(1);
  });

  it("dengan satu lahan menampilkan namanya tanpa pilihan, plus tiga pintasan", async () => {
    renderHalaman();
    await screen.findByText("Kelembapan Udara");
    expect(screen.queryByLabelText("Lahan aktif")).toBeNull();
    expect(screen.getByText("Sawah Utara")).toBeTruthy();
    const pintasan = within(screen.getByRole("navigation", { name: "Pintasan petani" }))
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(pintasan).toEqual([
      "/dashboard/simulasi",
      "/dashboard/musim-tanam",
      "/dashboard/notifikasi",
    ]);
  });
});

describe("formatTanggalPendek", () => {
  it("memberi hari singkat, tanggal, dan bulan singkat dalam bahasa Indonesia", async () => {
    await waitFor(() => expect(formatTanggalPendek("2026-10-12")).toMatch(/^Sen/));
    expect(formatTanggalPendek("2026-10-12")).toContain("12");
    expect(formatTanggalPendek("2026-10-12")).toMatch(/Okt/);
  });
});
