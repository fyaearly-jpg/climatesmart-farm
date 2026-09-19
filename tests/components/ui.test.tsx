// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, ErrorBanner, Skeleton } from "@/components/ui/AsyncUI";
import { ActivityBadge, RiskBadge, RoleBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("merender teks & varian default (primary, md)", () => {
    render(<Button>Simpan</Button>);
    const btn = screen.getByRole("button", { name: "Simpan" });
    expect(btn.className).toContain("from-brand-500");
    expect(btn.className).toContain("h-11");
  });

  it("menerapkan varian, ukuran, dan className tambahan", () => {
    render(
      <Button variant="danger" size="lg" className="mt-2">
        Hapus
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Hapus" });
    expect(btn.className).toContain("from-danger-glow");
    expect(btn.className).toContain("h-12");
    expect(btn.className).toContain("mt-2");
  });

  it("memanggil onClick dan menghormati disabled", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Klik</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Klik
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

const roles = { petani: "petani", penyuluh: "penyuluh", admin: "admin" } as const;

describe("Badge", () => {
  it("ActivityBadge menampilkan label untuk setiap aktivitas", () => {
    const { rerender } = render(<ActivityBadge activity="TANAM" />);
    expect(screen.getByText("Tanam")).toBeTruthy();
    for (const [activity, label] of [
      ["PUPUK", "Pupuk"],
      ["SEMPROT", "Semprot"],
      ["PANEN", "Panen"],
    ] as const) {
      rerender(<ActivityBadge activity={activity} />);
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("RiskBadge menampilkan label untuk setiap tingkat risiko", () => {
    const { rerender } = render(<RiskBadge risk="RENDAH" />);
    expect(screen.getByText("Risiko Rendah")).toBeTruthy();
    rerender(<RiskBadge risk="SEDANG" />);
    expect(screen.getByText("Risiko Sedang")).toBeTruthy();
    rerender(<RiskBadge risk="TINGGI" />);
    expect(screen.getByText("Risiko Tinggi")).toBeTruthy();
  });

  it("StatusBadge menampilkan label untuk setiap status validasi", () => {
    const { rerender } = render(<StatusBadge status="MENUNGGU" />);
    expect(screen.getByText("Menunggu")).toBeTruthy();
    rerender(<StatusBadge status="TERVALIDASI" />);
    expect(screen.getByText("Tervalidasi")).toBeTruthy();
    rerender(<StatusBadge status="DITOLAK" />);
    expect(screen.getByText("Ditolak")).toBeTruthy();
  });

  it("RoleBadge menampilkan label untuk setiap peran", () => {
    const { rerender } = render(<RoleBadge role={roles.petani} />);
    expect(screen.getByText("Petani")).toBeTruthy();
    rerender(<RoleBadge role={roles.penyuluh} />);
    expect(screen.getByText("Penyuluh")).toBeTruthy();
    rerender(<RoleBadge role={roles.admin} />);
    expect(screen.getByText("Admin")).toBeTruthy();
  });
});

describe("AsyncUI", () => {
  it("Skeleton merender jumlah baris sesuai prop dan tersembunyi dari pembaca layar", () => {
    const { container } = render(<Skeleton lines={4} />);
    expect(container.querySelectorAll(".skeleton-line")).toHaveLength(4);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });

  it("Skeleton default 3 baris", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelectorAll(".skeleton-line")).toHaveLength(3);
  });

  it("ErrorBanner menampilkan pesan dan tombol 'Coba lagi' yang memanggil onRetry", () => {
    const onRetry = vi.fn();
    render(<ErrorBanner message="Gagal memuat." onRetry={onRetry} />);
    expect(screen.getByRole("alert").textContent).toContain("Gagal memuat.");
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("ErrorBanner tanpa onRetry tidak menampilkan tombol", () => {
    render(<ErrorBanner message="Gagal." />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("EmptyState menampilkan pesan dengan role status", () => {
    render(<EmptyState message="Kosong." />);
    expect(screen.getByRole("status").textContent).toBe("Kosong.");
  });
});
