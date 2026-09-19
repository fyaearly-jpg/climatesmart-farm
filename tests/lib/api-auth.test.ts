import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorize } from "@/lib/api-auth";
import type { Session } from "@/lib/session-core";

const auth = vi.hoisted(() => ({ session: null as Session | null }));
vi.mock("@/lib/session", () => ({ getSession: async () => auth.session }));

const sessionOf = (role: Session["role"]): Session => ({
  role,
  name: "Uji",
  exp: Date.now() + 60_000,
});

describe("authorize (otorisasi Route Handler)", () => {
  beforeEach(() => {
    auth.session = null;
  });

  it("401 jika belum login", async () => {
    const result = await authorize();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      expect(await result.response.json()).toEqual({ message: "Belum login." });
    }
  });

  it("lolos untuk peran apa pun jika tidak ada batasan peran", async () => {
    auth.session = sessionOf("petani");
    const result = await authorize();
    expect(result.ok).toBe(true);
  });

  it("lolos jika peran termasuk yang diizinkan", async () => {
    auth.session = sessionOf("penyuluh");
    const result = await authorize("penyuluh", "admin");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.role).toBe("penyuluh");
  });

  it("403 jika peran tidak diizinkan", async () => {
    auth.session = sessionOf("petani");
    const result = await authorize("penyuluh");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });
});
