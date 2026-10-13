import { beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "@/app/providers";
import type { Session } from "@/lib/session-core";
import { renderToHtml } from "./server-render";

const auth = vi.hoisted(() => ({ session: null as Session | null }));
vi.mock("@/lib/session", () => ({
  getSession: async () => auth.session,
  startSession: async () => undefined,
  endSession: async () => undefined,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
// next/dynamic memuat komponen secara lazy; di test cukup dikembalikan langsung.
vi.mock("next/dynamic", async () => {
  const { ValidationTableClient } = await import("@/components/modules/ValidationTableClient");
  return { default: () => ValidationTableClient };
});

const as = (role: Session["role"] | null, name = "Fya Uji") => {
  auth.session = role ? { role, name, exp: Date.now() + 60_000 } : null;
};

describe("halaman publik", () => {
  beforeEach(() => as(null));

  it("landing page memuat judul, fitur, dan tautan ke login/register", async () => {
    const { default: Landing } = await import("@/app/page");
    const html = await renderToHtml(<Landing />);
    expect(html).toContain("Tanam lebih tepat waktu, panen lebih optimal.");
    expect(html).toContain("Rekomendasi AI Real-Time");
    expect(html).toContain("Validasi oleh Penyuluh");
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/register"');
    expect(html).toContain("<main");
  });

  it("halaman login tanpa error tidak menampilkan alert", async () => {
    const { default: Login } = await import("@/app/login/page");
    const html = await renderToHtml(await Login({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Selamat datang kembali");
    expect(html).not.toContain('role="alert"');
    expect(html).toContain("<main");
    expect(html).toMatch(/autocomplete="current-password"/i);
  });

  it("halaman login menampilkan pesan error dari query string", async () => {
    const { default: Login } = await import("@/app/login/page");
    const html = await renderToHtml(
      await Login({ searchParams: Promise.resolve({ error: "Email atau kata sandi salah." }) }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Email atau kata sandi salah.");
  });

  it("halaman login: pesan error di-escape (tidak menjadi HTML mentah)", async () => {
    const { default: Login } = await import("@/app/login/page");
    const html = await renderToHtml(
      await Login({ searchParams: Promise.resolve({ error: "<script>alert(1)</script>" }) }),
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("halaman register tidak menawarkan pilihan peran Admin/Penyuluh", async () => {
    const { default: Register } = await import("@/app/register/page");
    const html = await renderToHtml(await Register({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Daftar");
    expect(html).not.toContain('value="admin"');
    expect(html).not.toContain('value="penyuluh"');
    expect(html).not.toContain('name="role"');
    expect(html).toContain("<main");
    expect(html).toMatch(/autocomplete="new-password"/i);
  });

  it("halaman register menampilkan pesan error", async () => {
    const { default: Register } = await import("@/app/register/page");
    const html = await renderToHtml(
      await Register({
        searchParams: Promise.resolve({ error: "Email sudah terdaftar. Silakan masuk." }),
      }),
    );
    expect(html).toContain("Email sudah terdaftar. Silakan masuk.");
  });

  it("root layout membungkus konten dengan <html lang=id> dan Providers", async () => {
    const { default: RootLayout } = await import("@/app/layout");
    const html = await renderToHtml(RootLayout({ children: <p>isi halaman</p> }));
    expect(html).toContain('lang="id"');
    expect(html).toContain("isi halaman");
  });
});

describe("dashboard/layout", () => {
  it("tanpa sesi -> redirect ke /login (pertahanan berlapis selain proxy.ts)", async () => {
    as(null);
    const { default: Layout } = await import("@/app/dashboard/layout");
    await expect(Layout({ children: <p>rahasia</p> })).rejects.toThrow("REDIRECT:/login");
  });

  it("dengan sesi menampilkan nama, badge peran, tombol keluar, dan konten", async () => {
    as("penyuluh", "Bu Sari");
    const { default: Layout } = await import("@/app/dashboard/layout");
    const html = await renderToHtml(await Layout({ children: <p>konten dashboard</p> }));
    expect(html).toContain("Bu Sari");
    expect(html).toContain("Penyuluh");
    expect(html).toContain("Keluar");
    expect(html).toContain("konten dashboard");
    expect(html).toContain("Validasi Rekomendasi");
  });

  it("loading.tsx merender kerangka skeleton", async () => {
    const { default: Loading } = await import("@/app/dashboard/loading");
    const html = await renderToHtml(<Loading />);
    expect(html).toContain("skeleton-line");
  });
});

describe("dashboard/page (konten per peran)", () => {
  async function renderDashboard(searchParams: { denied?: string } = {}) {
    const { default: Page } = await import("@/app/dashboard/page");
    return renderToHtml(
      <Providers>{await Page({ searchParams: Promise.resolve(searchParams) })}</Providers>,
    );
  }

  it("petani: Beranda Petani dimuat (data diambil di sisi klien dari API)", async () => {
    as("petani", "Fya Petani");
    const html = await renderDashboard();
    expect(html).toContain("Halo, Fya");
    // Render server hanya memuat kerangka; cuaca, jadwal, dan prediksi datang dari API lewat TanStack Query.
    expect(html).toContain("Memuat lahan");
    expect(html).not.toContain("Total Pengguna");
  });

  it("penyuluh: ringkasan jumlah rekomendasi menunggu validasi", async () => {
    as("penyuluh", "Bu Sari");
    const html = await renderDashboard();
    expect(html).toContain("Rekomendasi menunggu validasi Anda");
    expect(html).toContain("Buka Halaman Validasi");
    expect(html).not.toContain("Memuat lahan");
  });

  it("admin: ringkasan statistik pengguna", async () => {
    as("admin", "Admin Demo");
    const html = await renderDashboard();
    expect(html).toContain("Total Pengguna");
    expect(html).toContain("Kelola Pengguna");
    expect(html).not.toContain("Memuat lahan");
  });

  it.each([
    ["petani", "Petani"],
    ["penyuluh", "Penyuluh"],
    ["admin", "Admin"],
    ["lainnya", "lain"],
  ])("pesan 'ditolak' untuk denied=%s menyebut peran %s", async (denied, label) => {
    as("petani");
    const html = await renderDashboard({ denied });
    expect(html).toContain(`Halaman itu khusus peran ${label}`);
  });

  it("tanpa sesi tetap tidak menampilkan panel peran apa pun", async () => {
    as(null);
    const html = await renderDashboard();
    expect(html).not.toContain("Memuat lahan");
    expect(html).not.toContain("Total Pengguna");
  });
});

// Catatan: validasi/page sekarang Client Component (hooks + TanStack Query) sehingga tidak
// bisa dirender lewat `renderToHtml(await Page())`. Pengujiannya ada di
// tests/validasi-page.test.tsx.
describe("halaman peran khusus", () => {
  it("admin/page menampilkan daftar pengguna demo dalam tabel", async () => {
    const { default: AdminPage } = await import("@/app/dashboard/admin/page");
    const html = await renderToHtml(await AdminPage());
    expect(html).toContain("Kelola Pengguna");
    expect(html).toContain("petani@demo.csf");
    expect(html).toContain("penyuluh@demo.csf");
    expect(html).toContain("admin@demo.csf");
    expect(html).not.toContain("passwordHash");
  });

  it("tambah-lahan/page dialihkan ke halaman Lahan saya", async () => {
    const { default: TambahLahan } = await import("@/app/dashboard/tambah-lahan/page");
    expect(() => TambahLahan()).toThrow("REDIRECT:/dashboard/lahan");
  });
});
