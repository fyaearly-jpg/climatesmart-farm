import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ startSession: vi.fn(), endSession: vi.fn() }));
vi.mock("@/lib/session", () => session);
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function redirectOf(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.startsWith("REDIRECT:"))
      return decodeURIComponent(message.slice("REDIRECT:".length));
    throw err;
  }
  return "(tidak ada redirect)";
}

describe("Server Actions autentikasi", () => {
  beforeEach(() => {
    (globalThis as { __csfUsers?: unknown }).__csfUsers = undefined;
    vi.resetModules();
    session.startSession.mockReset();
    session.endSession.mockReset();
  });

  it("register membuat akun Petani & mengabaikan role=admin dari form", async () => {
    const { registerAction } = await import("@/lib/actions");
    const target = await redirectOf(() =>
      registerAction(
        form({ name: "Penyerang", email: "penyerang@uji.id", password: "abc12345", role: "admin" }),
      ),
    );
    expect(target).toBe("/dashboard");
    expect(session.startSession).toHaveBeenCalledWith(expect.objectContaining({ role: "petani" }));
  });

  it("register dengan data tidak valid dialihkan kembali dengan pesan error", async () => {
    const { registerAction } = await import("@/lib/actions");
    const target = await redirectOf(() =>
      registerAction(form({ name: "Bu", email: "bukan-email", password: "x" })),
    );
    expect(target.startsWith("/register?error=")).toBe(true);
    expect(session.startSession).not.toHaveBeenCalled();
  });

  it("register dengan email yang sudah ada ditolak", async () => {
    const { registerAction } = await import("@/lib/actions");
    const target = await redirectOf(() =>
      registerAction(
        form({ name: "Petani Ganda", email: "petani@demo.csf", password: "abc12345" }),
      ),
    );
    expect(target).toBe("/register?error=Email sudah terdaftar. Silakan masuk.");
  });

  it("login berhasil memulai sesi sesuai peran akun", async () => {
    const { loginAction } = await import("@/lib/actions");
    const target = await redirectOf(() =>
      loginAction(form({ email: "admin@demo.csf", password: "admin1234" })),
    );
    expect(target).toBe("/dashboard");
    expect(session.startSession).toHaveBeenCalledWith(expect.objectContaining({ role: "admin" }));
  });

  it("login dengan input tidak valid dialihkan ke /login", async () => {
    const { loginAction } = await import("@/lib/actions");
    const target = await redirectOf(() => loginAction(form({ email: "salah", password: "" })));
    expect(target).toBe("/login?error=Email atau kata sandi tidak valid.");
  });

  it("login dengan kata sandi salah ditolak tanpa membuat sesi", async () => {
    const { loginAction } = await import("@/lib/actions");
    const target = await redirectOf(() =>
      loginAction(form({ email: "admin@demo.csf", password: "salah-total" })),
    );
    expect(target).toBe("/login?error=Email atau kata sandi salah.");
    expect(session.startSession).not.toHaveBeenCalled();
  });

  it("logout menghapus sesi lalu ke /login", async () => {
    const { logoutAction } = await import("@/lib/actions");
    const target = await redirectOf(() => logoutAction());
    expect(target).toBe("/login");
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });
});
