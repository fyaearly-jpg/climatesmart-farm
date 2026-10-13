// @vitest-environment jsdom
//
// tests/notifikasi-page.test.tsx
// Halaman kotak masuk (Client Component): dirender di dalam QueryClientProvider, fetch dimock.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotifikasiPage from "@/app/dashboard/notifikasi/page";

const N = (id: number, tahap: string, over: Record<string, unknown> = {}) => ({
  id_notifikasi: id,
  id_rekomendasi: 310,
  tahap,
  pesan: `Pesan ${id}`,
  tanggal: "2026-10-09",
  status_kirim: "terkirim",
  dibaca: false,
  ...over,
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;
let isi: { data: unknown[]; meta: { page: number; per_page: number; total: number } };

function renderHalaman() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NotifikasiPage />
    </QueryClientProvider>,
  );
}
const urls = () => fetchMock.mock.calls.map((c) => new URL((c as [string])[0], "http://x"));

beforeEach(() => {
  isi = {
    data: [
      N(451, "saran", { pesan: "SARAN: Pantau 3 hari" }),
      N(450, "waspada", {
        pesan: "WASPADA: Periksa lahan",
        dibaca: true,
        status_kirim: "belum_terkirim",
      }),
    ],
    meta: { page: 1, per_page: 20, total: 2 },
  };
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") return json({ data: { id_notifikasi: 451, dibaca: true } });
    const u = new URL(url, "http://x");
    return json({ ...isi, meta: { ...isi.meta, page: Number(u.searchParams.get("page") ?? 1) } });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("halaman notifikasi", () => {
  it("menampilkan dua tahap dengan label teks, penanda Baru, dan status belum terkirim", async () => {
    renderHalaman();
    expect(await screen.findByText("SARAN: Pantau 3 hari")).toBeTruthy();
    expect(screen.getByText("Saran pengendalian")).toBeTruthy();
    expect(screen.getByText("Peringatan awal")).toBeTruthy();
    expect(screen.getByText("Baru")).toBeTruthy();
    expect(screen.getByText(/Belum terkirim ke WhatsApp/)).toBeTruthy();
    // hanya yang belum dibaca punya tombol
    expect(screen.getAllByRole("button", { name: /Tandai dibaca/ })).toHaveLength(1);
  });

  it("menandai dibaca lewat PATCH lalu memuat ulang daftar", async () => {
    const user = userEvent.setup();
    renderHalaman();
    await user.click(await screen.findByRole("button", { name: /Tandai dibaca/ }));

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([, i]) => (i as RequestInit | undefined)?.method === "PATCH",
      ) as [string, RequestInit];
      expect(patch[0]).toBe("/api/v1/notifikasi/451/baca");
    });
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(
          ([, i]) => !(i as RequestInit | undefined)?.method || (i as RequestInit).method === "GET",
        ).length,
      ).toBeGreaterThan(1),
    );
  });

  it("filter Belum dibaca meminta dibaca=false dan menampilkan jumlah", async () => {
    const user = userEvent.setup();
    renderHalaman();
    await screen.findByText("SARAN: Pantau 3 hari");
    isi = { data: [N(451, "saran")], meta: { page: 1, per_page: 20, total: 1 } };
    await user.click(screen.getByRole("button", { name: "Belum dibaca" }));

    expect(await screen.findByText("1 belum dibaca")).toBeTruthy();
    const terakhir = urls().at(-1);
    expect(terakhir?.searchParams.get("dibaca")).toBe("false");
    expect(terakhir?.searchParams.get("page")).toBe("1");
    expect(screen.getByRole("button", { name: "Belum dibaca" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("keadaan kosong berbeda untuk Semua dan Belum dibaca", async () => {
    const user = userEvent.setup();
    isi = { data: [], meta: { page: 1, per_page: 20, total: 0 } };
    renderHalaman();
    expect(await screen.findByText("Belum ada notifikasi.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Belum dibaca" }));
    expect(await screen.findByText("Semua notifikasi sudah dibaca.")).toBeTruthy();
  });

  it("paginasi: Halaman 1 dari 3, Berikutnya meminta page=2, Sebelumnya kembali", async () => {
    const user = userEvent.setup();
    isi = { data: [N(451, "saran")], meta: { page: 1, per_page: 20, total: 45 } };
    renderHalaman();
    expect(await screen.findByText("Halaman 1 dari 3")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Sebelumnya" }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    await user.click(screen.getByRole("button", { name: "Berikutnya" }));
    expect(await screen.findByText("Halaman 2 dari 3")).toBeTruthy();
    expect(urls().at(-1)?.searchParams.get("page")).toBe("2");

    await user.click(screen.getByRole("button", { name: "Sebelumnya" }));
    expect(await screen.findByText("Halaman 1 dari 3")).toBeTruthy();
  });

  it("tanpa navigasi halaman bila hanya satu halaman", async () => {
    renderHalaman();
    await screen.findByText("SARAN: Pantau 3 hari");
    expect(screen.queryByRole("navigation", { name: "Halaman notifikasi" })).toBeNull();
  });

  it("galat memuat: pesan dari backend dan tombol coba lagi", async () => {
    fetchMock.mockImplementation(async () =>
      json({ error: { code: "SERVER_ERROR", message: "Gagal memuat notifikasi." } }, 500),
    );
    renderHalaman();
    expect(await screen.findByText("Gagal memuat notifikasi.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeTruthy();
  });

  it("galat saat menandai dibaca ditampilkan", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === "PATCH"
        ? json(
            { error: { code: "AKSES_DITOLAK", message: "Notifikasi ini bukan milik Anda." } },
            403,
          )
        : json(isi),
    );
    renderHalaman();
    await user.click(await screen.findByRole("button", { name: /Tandai dibaca/ }));
    expect(await screen.findByText("Notifikasi ini bukan milik Anda.")).toBeTruthy();
  });
});
