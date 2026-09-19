import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hanya randomInt yang diganti (untuk hasil deterministik); fungsi crypto lain tetap asli.
const crypto = vi.hoisted(() => ({ randomInt: vi.fn() }));
vi.mock("node:crypto", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:crypto")>()),
  randomInt: crypto.randomInt,
}));

type GlobalStores = { __csfUsers?: unknown; __csfRecommendations?: unknown };

function resetStores() {
  const g = globalThis as GlobalStores;
  delete g.__csfUsers;
  delete g.__csfRecommendations;
  vi.resetModules();
}

describe("lib/data/users", () => {
  beforeEach(resetStores);

  it("menyediakan 3 akun demo (petani, penyuluh, admin)", async () => {
    const users = await import("@/lib/data/users");
    const stats = await users.getUserStats();
    expect(stats).toEqual({ total: 3, petani: 1, penyuluh: 1, admin: 1 });
  });

  it("registerUser menyimpan pengguna baru tanpa membocorkan hash/salt", async () => {
    const users = await import("@/lib/data/users");
    const created = await users.registerUser({
      name: "Budi Santoso",
      email: "budi@contoh.id",
      password: "rahasia123",
      role: "petani",
    });
    expect("error" in created).toBe(false);
    expect(created).not.toHaveProperty("passwordHash");
    expect(created).not.toHaveProperty("salt");
    expect((await users.getUserStats()).total).toBe(4);
  });

  it("registerUser menolak email yang sudah terdaftar (tidak peka huruf besar/kecil)", async () => {
    const users = await import("@/lib/data/users");
    const result = await users.registerUser({
      name: "Duplikat",
      email: "PETANI@demo.csf",
      password: "rahasia123",
      role: "petani",
    });
    expect(result).toEqual({ error: "Email sudah terdaftar. Silakan masuk." });
  });

  it("verifyLogin berhasil untuk kredensial benar", async () => {
    const users = await import("@/lib/data/users");
    const result = await users.verifyLogin("penyuluh@demo.csf", "penyuluh123");
    expect("error" in result).toBe(false);
    if (!("error" in result)) expect(result.role).toBe("penyuluh");
  });

  it("verifyLogin gagal untuk kata sandi salah atau email tidak dikenal", async () => {
    const users = await import("@/lib/data/users");
    const wrongPassword = await users.verifyLogin("admin@demo.csf", "salah");
    const unknownEmail = await users.verifyLogin("tidak-ada@demo.csf", "apapun123");
    expect(wrongPassword).toEqual({ error: "Email atau kata sandi salah." });
    expect(unknownEmail).toEqual({ error: "Email atau kata sandi salah." });
  });

  it("getAllUsers mengembalikan daftar tanpa data rahasia", async () => {
    const users = await import("@/lib/data/users");
    const all = await users.getAllUsers();
    expect(all).toHaveLength(3);
    for (const user of all)
      expect(Object.keys(user).sort()).toEqual(["createdAt", "email", "id", "name", "role"]);
  });
});

describe("lib/data/recommendations", () => {
  beforeEach(() => {
    resetStores();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function settle<T>(promise: Promise<T>): Promise<T> {
    await vi.advanceTimersByTimeAsync(300);
    return promise;
  }

  it("getRecommendations mengembalikan data seed yang lolos validasi Zod", async () => {
    const mod = await import("@/lib/data/recommendations");
    const list = await settle(mod.getRecommendations());
    expect(list).toHaveLength(3);
    expect(list.filter((r) => r.status === "MENUNGGU")).toHaveLength(2);
  });

  it("createRecommendation menaruh data baru di urutan pertama dengan status MENUNGGU", async () => {
    const mod = await import("@/lib/data/recommendations");
    const created = await settle(
      mod.createRecommendation({
        plotName: "Lahan Baru",
        commodity: "Jagung",
        activity: "PANEN",
        scheduledDate: "2026-10-01",
      }),
    );
    expect(created.status).toBe("MENUNGGU");
    const list = await settle(mod.getRecommendations());
    expect(list[0]?.id).toBe(created.id);
    expect(list).toHaveLength(4);
  });

  it("validateRecommendation mengubah status rekomendasi", async () => {
    const mod = await import("@/lib/data/recommendations");
    const [first] = await settle(mod.getRecommendations());
    expect(first).toBeDefined();
    const updated = await settle(mod.validateRecommendation(first?.id ?? "", "DITOLAK"));
    expect(updated.status).toBe("DITOLAK");
    const list = await settle(mod.getRecommendations());
    expect(list.find((r) => r.id === first?.id)?.status).toBe("DITOLAK");
  });

  it("validateRecommendation melempar error untuk id yang tidak ada", async () => {
    const mod = await import("@/lib/data/recommendations");
    const attempt = expect(mod.validateRecommendation("tidak-ada", "TERVALIDASI")).rejects.toThrow(
      "Rekomendasi tidak ditemukan.",
    );
    await vi.advanceTimersByTimeAsync(300);
    await attempt;
  });
});

describe("lib/data/weather & sensor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    crypto.randomInt.mockReset();
  });

  it("getWeather memilih sampel sesuai indeks acak (crypto.randomInt) dan lolos skema", async () => {
    crypto.randomInt.mockReturnValue(2);
    const { getWeather } = await import("@/lib/data/weather");
    const promise = getWeather();
    await vi.advanceTimersByTimeAsync(200);
    const sample = await promise;
    expect(sample.kondisi).toBe("Hujan Lebat");
    expect(sample.risiko).toBe("TINGGI");
  });

  it("getSensor memilih sampel sesuai indeks acak (crypto.randomInt) dan lolos skema", async () => {
    crypto.randomInt.mockReturnValue(0);
    const { getSensor } = await import("@/lib/data/sensor");
    const promise = getSensor();
    await vi.advanceTimersByTimeAsync(200);
    const sample = await promise;
    expect(sample.statusIrigasi).toBe("Cukup");
  });
});
