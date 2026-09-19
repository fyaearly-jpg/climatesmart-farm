import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from "@/lib/session-core";

const SECRET = "s".repeat(40);

function signManually(payloadObject: unknown, secret = SECRET): string {
  const payload = Buffer.from(
    typeof payloadObject === "string" ? payloadObject : JSON.stringify(payloadObject),
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

describe("session-core", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("token yang dibuat dapat diverifikasi kembali", () => {
    const token = createSessionToken("penyuluh", "Bu Sari");
    const session = verifySessionToken(token);
    expect(session?.role).toBe("penyuluh");
    expect(session?.name).toBe("Bu Sari");
  });

  it("menolak token kosong atau undefined", () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
  });

  it("menolak format token yang salah", () => {
    expect(verifySessionToken("tanpa-titik")).toBeNull();
    expect(verifySessionToken("a.b.c")).toBeNull();
    expect(verifySessionToken(".signature")).toBeNull();
    expect(verifySessionToken("payload.")).toBeNull();
  });

  it("menolak payload yang diubah (mis. petani dipalsukan jadi admin)", () => {
    const token = createSessionToken("petani", "Budi");
    const signature = token.split(".")[1];
    const forged = Buffer.from(
      JSON.stringify({ role: "admin", name: "Budi", exp: Date.now() + 1_000_000 }),
    ).toString("base64url");
    expect(verifySessionToken(`${forged}.${signature}`)).toBeNull();
  });

  it("menolak tanda tangan dengan panjang berbeda", () => {
    const token = createSessionToken("petani", "Budi");
    const payload = token.split(".")[0];
    expect(verifySessionToken(`${payload}.abc`)).toBeNull();
  });

  it("menolak token yang ditandatangani dengan kunci lain", () => {
    const token = createSessionToken("admin", "Admin");
    vi.stubEnv("SESSION_SECRET", "x".repeat(40));
    expect(verifySessionToken(token)).toBeNull();
  });

  it("menolak token yang sudah kedaluwarsa", () => {
    const issuedAt = 1_000_000;
    const token = createSessionToken("petani", "Budi", issuedAt);
    const expiredAt = issuedAt + SESSION_MAX_AGE_SECONDS * 1000 + 1;
    expect(verifySessionToken(token, expiredAt)).toBeNull();
    expect(verifySessionToken(token, issuedAt + 1000)?.role).toBe("petani");
  });

  it("menolak payload bertanda tangan sah tetapi bukan JSON", () => {
    expect(verifySessionToken(signManually("bukan-json"))).toBeNull();
  });

  it("menolak payload bertanda tangan sah tetapi role tidak dikenal", () => {
    const token = signManually({ role: "root", name: "X", exp: Date.now() + 100_000 });
    expect(verifySessionToken(token)).toBeNull();
  });

  it("di development tanpa SESSION_SECRET memakai kunci bawaan", () => {
    vi.stubEnv("SESSION_SECRET", "");
    const token = createSessionToken("petani", "Dev");
    expect(verifySessionToken(token)?.name).toBe("Dev");
  });

  it("di production tanpa SESSION_SECRET melempar error yang jelas", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    expect(() => createSessionToken("petani", "Budi")).toThrow(/SESSION_SECRET/);
  });

  it("di production menolak SESSION_SECRET yang terlalu pendek", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "pendek");
    expect(() => createSessionToken("petani", "Budi")).toThrow(/SESSION_SECRET/);
  });
});
