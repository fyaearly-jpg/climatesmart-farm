import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { endSession, getSession, startSession } from "@/lib/session";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session-core";

const store = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => store }));

describe("lib/session (cookie httpOnly bertanda tangan)", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "k".repeat(40));
    store.get.mockReset();
    store.set.mockReset();
    store.delete.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("startSession menulis cookie httpOnly + sameSite lax dengan masa berlaku 8 jam", async () => {
    await startSession({ role: "petani", name: "Budi" });
    expect(store.set).toHaveBeenCalledTimes(1);
    const [name, value, options] = store.set.mock.calls[0] ?? [];
    expect(name).toBe(SESSION_COOKIE);
    expect(typeof value).toBe("string");
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
      secure: false,
    });
  });

  it("startSession menandai cookie Secure di production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await startSession({ role: "admin", name: "Admin" });
    expect(store.set.mock.calls[0]?.[2]).toMatchObject({ secure: true });
  });

  it("getSession membaca sesi valid dari cookie", async () => {
    store.get.mockReturnValue({ value: createSessionToken("penyuluh", "Bu Sari") });
    const session = await getSession();
    expect(session?.role).toBe("penyuluh");
    expect(store.get).toHaveBeenCalledWith(SESSION_COOKIE);
  });

  it("getSession mengembalikan null jika cookie tidak ada atau rusak", async () => {
    store.get.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
    store.get.mockReturnValue({ value: "token.palsu" });
    expect(await getSession()).toBeNull();
  });

  it("endSession menghapus cookie sesi", async () => {
    await endSession();
    expect(store.delete).toHaveBeenCalledWith(SESSION_COOKIE);
  });
});
