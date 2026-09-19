// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormEntryClient } from "@/components/modules/FormEntryClient";
import { LiveWeatherWidget } from "@/components/modules/LiveWeatherWidget";
import { RecommendationsListClient } from "@/components/modules/RecommendationsListClient";
import { SidebarNav } from "@/components/modules/SidebarNav";
import { ThemeToggle } from "@/components/modules/ThemeToggle";
import { ValidationTableClient } from "@/components/modules/ValidationTableClient";
import { RecommendationsPanel } from "@/components/panels/RecommendationsPanel";
import { SensorPanel } from "@/components/panels/SensorPanel";
import { WeatherPanel } from "@/components/panels/WeatherPanel";
import type { WeatherSample } from "@/lib/schemas";
import { useUIStore } from "@/store/useUIStore";
import { createClient, jsonResponse, renderWithClient, sampleRecommendations } from "../helpers";

const nav = vi.hoisted(() => ({ pathname: "/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  nav.pathname = "/dashboard";
  useUIStore.setState({
    isSidebarCollapsed: false,
    selectedActivityFilter: "SEMUA",
    isFilterDrawerOpen: false,
    themeMode: "light",
  });
  document.documentElement.removeAttribute("data-theme");
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SidebarNav", () => {
  it.each([
    ["petani", "Tambah Lahan"],
    ["penyuluh", "Validasi Rekomendasi"],
    ["admin", "Kelola Pengguna"],
  ] as const)("peran %s melihat menu %s (dan Dashboard)", (role, label) => {
    render(<SidebarNav role={role} />);
    expect(screen.getByRole("link", { name: /Dashboard/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: new RegExp(label) })).toBeTruthy();
  });

  it("peran tidak melihat menu milik peran lain", () => {
    const petani = "petani" as const;
    render(<SidebarNav role={petani} />);
    expect(screen.queryByRole("link", { name: /Validasi/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Kelola Pengguna/ })).toBeNull();
  });

  it("menandai link aktif dengan aria-current=page", () => {
    nav.pathname = "/dashboard/validasi";
    const penyuluh = "penyuluh" as const;
    render(<SidebarNav role={penyuluh} />);
    expect(screen.getByRole("link", { name: /Validasi/ }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("link", { name: /Dashboard/ }).getAttribute("aria-current")).toBeNull();
  });

  it("tombol collapse menyembunyikan label dan mengubah aria-expanded", () => {
    const admin = "admin" as const;
    render(<SidebarNav role={admin} />);
    const toggle = screen.getByRole("button");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Kelola Pengguna")).toBeNull();
  });
});

describe("ThemeToggle", () => {
  it("mengatur atribut data-theme dan bergantian terang/gelap", () => {
    render(<ThemeToggle />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    fireEvent.click(screen.getByRole("button", { name: /mode tema/i }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: /mode tema/i }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });
});

describe("LiveWeatherWidget", () => {
  const weather: WeatherSample = {
    suhu: 29,
    kelembapanUdara: 70,
    kondisi: "Cerah",
    risiko: "RENDAH",
  };

  it("menampilkan data cuaca awal dari server", () => {
    renderWithClient(<LiveWeatherWidget initialData={weather} />);
    expect(screen.getByText("29°C")).toBeTruthy();
    expect(screen.getByText("70%")).toBeTruthy();
    expect(screen.getByText("Cerah")).toBeTruthy();
    expect(screen.getByText("Risiko Rendah")).toBeTruthy();
  });

  it("menampilkan ErrorBanner saat refresh gagal, dan 'Coba lagi' mengulang fetch", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    const { client } = renderWithClient(<LiveWeatherWidget initialData={weather} />);
    await act(async () => {
      await client.refetchQueries({ queryKey: ["weather"] });
    });
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Gagal memuat data cuaca.");

    fetchMock.mockResolvedValue(jsonResponse({ ...weather, suhu: 35 }));
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(await screen.findByText("35°C")).toBeTruthy();
  });
});

describe("RecommendationsListClient", () => {
  it("menampilkan semua rekomendasi dan filter aktivitas menyaringnya", () => {
    renderWithClient(<RecommendationsListClient initialData={sampleRecommendations} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Pupuk" }));
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toContain("Sawah Blok B");
    expect(screen.getByRole("button", { name: "Pupuk" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("menampilkan pesan kosong khusus kategori bila tidak ada hasil", () => {
    renderWithClient(<RecommendationsListClient initialData={sampleRecommendations} />);
    fireEvent.click(screen.getByRole("button", { name: "Panen" }));
    expect(screen.getByRole("status").textContent).toContain('kategori "Panen"');
  });

  it("menampilkan pesan umum bila data benar-benar kosong", () => {
    renderWithClient(<RecommendationsListClient initialData={[]} />);
    expect(screen.getByRole("status").textContent).toContain("Belum ada rekomendasi");
  });

  it("menampilkan ErrorBanner bila refetch gagal", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    const { client } = renderWithClient(
      <RecommendationsListClient initialData={sampleRecommendations} />,
    );
    await act(async () => {
      await client.refetchQueries({ queryKey: ["recommendations"] });
    });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Gagal mengambil data rekomendasi",
    );
  });
});

describe("ValidationTableClient", () => {
  it("hanya menampilkan rekomendasi berstatus MENUNGGU", () => {
    renderWithClient(<ValidationTableClient initialData={sampleRecommendations} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText("Sawah Blok B")).toBeNull();
  });

  it("menampilkan EmptyState bila tidak ada yang menunggu", () => {
    renderWithClient(
      <ValidationTableClient
        initialData={sampleRecommendations.filter((r) => r.status !== "MENUNGGU")}
      />,
    );
    expect(screen.getByRole("status").textContent).toContain("Tidak ada rekomendasi");
  });

  it("'Setujui' mengirim PATCH TERVALIDASI, lalu daftar dimuat ulang", async () => {
    const [first, second, third] = sampleRecommendations;
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") return jsonResponse({ ...first, status: "TERVALIDASI" });
      return jsonResponse([{ ...first, status: "TERVALIDASI" }, second, third]);
    });
    renderWithClient(<ValidationTableClient initialData={sampleRecommendations} />);
    const row = screen.getAllByRole("listitem")[0] as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Setujui" }));

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(patchCall?.[0]).toBe(`/api/recommendations/${first?.id}/validate`);
    expect(patchCall?.[1]?.body).toBe(JSON.stringify({ decision: "TERVALIDASI" }));
  });

  it("'Tolak' mengirim DITOLAK dan menampilkan pesan error dari server pada baris terkait", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Rekomendasi tidak ditemukan." }, 404));
    renderWithClient(<ValidationTableClient initialData={sampleRecommendations} />);
    const row = screen.getAllByRole("listitem")[0] as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Tolak" }));

    expect(await within(row).findByRole("alert")).toBeTruthy();
    expect(within(row).getByRole("alert").textContent).toBe("Rekomendasi tidak ditemukan.");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ decision: "DITOLAK" });
  });

  it("menampilkan ErrorBanner bila pemuatan ulang gagal", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    const { client } = renderWithClient(
      <ValidationTableClient initialData={sampleRecommendations} />,
    );
    await act(async () => {
      await client.refetchQueries({ queryKey: ["recommendations"] });
    });
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});

describe("FormEntryClient", () => {
  async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Nama Lahan"), "Sawah Uji");
    await user.type(screen.getByLabelText("Komoditas"), "Padi");
    fireEvent.change(screen.getByLabelText("Luas Lahan (Ha)"), { target: { value: "2.5" } });
    await user.selectOptions(screen.getByLabelText("Jenis Aktivitas"), "PANEN");
    fireEvent.change(screen.getByLabelText("Tanggal Jadwal"), { target: { value: "2026-09-25" } });
  }

  it("submit kosong menampilkan error validasi per field & tidak memanggil server", async () => {
    const user = userEvent.setup();
    renderWithClient(<FormEntryClient />);
    await user.click(screen.getByRole("button", { name: "Simpan Data Lahan" }));
    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByLabelText("Nama Lahan").getAttribute("aria-invalid")).toBe("true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submit valid mengirim POST, menampilkan pesan sukses, lalu mengosongkan form", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ...sampleRecommendations[0], plotName: "Sawah Uji" }, 201),
    );
    const user = userEvent.setup();
    renderWithClient(<FormEntryClient />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Simpan Data Lahan" }));

    expect((await screen.findByRole("status")).textContent).toContain(
      'Lahan "Sawah Uji" berhasil didaftarkan',
    );
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/recommendations");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      plotName: "Sawah Uji",
      areaHectare: 2.5,
      activity: "PANEN",
    });
    await waitFor(() =>
      expect((screen.getByLabelText("Nama Lahan") as HTMLInputElement).value).toBe(""),
    );
  });

  it("menampilkan pesan error dari server bila penyimpanan gagal", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Peran Anda tidak diizinkan untuk aksi ini." }, 403),
    );
    const user = userEvent.setup();
    renderWithClient(<FormEntryClient />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Simpan Data Lahan" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Peran Anda tidak diizinkan untuk aksi ini.",
    );
  });
});

describe("Panels (Server Component async)", () => {
  it("SensorPanel merender pembacaan sensor", async () => {
    render(await SensorPanel());
    expect(screen.getByText("Kelembapan Tanah")).toBeTruthy();
    expect(screen.getByText("Status Irigasi")).toBeTruthy();
  });

  it("WeatherPanel meneruskan data server ke widget klien", async () => {
    renderWithClient(await WeatherPanel(), createClient());
    expect(screen.getByText("Kelembapan Udara")).toBeTruthy();
    expect(screen.getByText("Tingkat Risiko")).toBeTruthy();
  });

  it("RecommendationsPanel memuat daftar rekomendasi awal", async () => {
    renderWithClient(await RecommendationsPanel(), createClient());
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
  });
});
