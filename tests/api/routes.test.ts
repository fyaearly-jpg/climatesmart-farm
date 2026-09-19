import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FarmRecommendation } from "@/lib/schemas";
import type { Session } from "@/lib/session-core";

const auth = vi.hoisted(() => ({ session: null as Session | null }));
vi.mock("@/lib/session", () => ({ getSession: async () => auth.session }));

const as = (role: Session["role"] | null) => {
  auth.session = role ? { role, name: "Uji", exp: Date.now() + 60_000 } : null;
};

const validPlot = {
  plotName: "Lahan Uji",
  commodity: "Padi",
  areaHectare: 1.5,
  activity: "TANAM",
  scheduledDate: "2026-09-25",
};

function jsonRequest(method: string, body: unknown): Request {
  return new Request("http://localhost/api", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loadRoutes() {
  const recs = await import("@/app/api/recommendations/route");
  const validate = await import("@/app/api/recommendations/[id]/validate/route");
  const weather = await import("@/app/api/weather/route");
  const sensor = await import("@/app/api/sensor/route");
  return { recs, validate, weather, sensor };
}

describe("Route Handler /api/* — otorisasi & perilaku", () => {
  beforeEach(() => {
    (globalThis as { __csfRecommendations?: unknown }).__csfRecommendations = undefined;
    vi.resetModules();
    as(null);
  });

  it("semua endpoint menjawab 401 tanpa login", async () => {
    const { recs, validate, weather, sensor } = await loadRoutes();
    expect((await recs.GET()).status).toBe(401);
    expect((await recs.POST(jsonRequest("POST", validPlot))).status).toBe(401);
    expect(
      (
        await validate.PATCH(jsonRequest("PATCH", { decision: "DITOLAK" }), {
          params: Promise.resolve({ id: "x" }),
        })
      ).status,
    ).toBe(401);
    expect((await weather.GET()).status).toBe(401);
    expect((await sensor.GET()).status).toBe(401);
  });

  it("GET /api/recommendations: semua peran yang login boleh membaca", async () => {
    const { recs } = await loadRoutes();
    as("penyuluh");
    const res = await recs.GET();
    expect(res.status).toBe(200);
    const list = (await res.json()) as FarmRecommendation[];
    expect(list).toHaveLength(3);
  });

  it("POST /api/recommendations: hanya petani (penyuluh & admin 403)", async () => {
    const { recs } = await loadRoutes();
    as("penyuluh");
    expect((await recs.POST(jsonRequest("POST", validPlot))).status).toBe(403);
    as("admin");
    expect((await recs.POST(jsonRequest("POST", validPlot))).status).toBe(403);
  });

  it("POST /api/recommendations: petani 400 untuk data invalid, 201 untuk valid", async () => {
    const { recs } = await loadRoutes();
    as("petani");
    const bad = await recs.POST(jsonRequest("POST", { ...validPlot, plotName: "a" }));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ message: "Validasi gagal" });

    const ok = await recs.POST(jsonRequest("POST", validPlot));
    expect(ok.status).toBe(201);
    expect(((await ok.json()) as FarmRecommendation).status).toBe("MENUNGGU");
  });

  it("PATCH validate: petani & admin 403", async () => {
    const { validate } = await loadRoutes();
    const params = { params: Promise.resolve({ id: "apa-saja" }) };
    as("petani");
    expect(
      (await validate.PATCH(jsonRequest("PATCH", { decision: "TERVALIDASI" }), params)).status,
    ).toBe(403);
    as("admin");
    expect(
      (await validate.PATCH(jsonRequest("PATCH", { decision: "TERVALIDASI" }), params)).status,
    ).toBe(403);
  });

  it("PATCH validate: penyuluh 400 (payload salah), 404 (id tak ada), 200 (berhasil)", async () => {
    const { recs, validate } = await loadRoutes();
    as("penyuluh");
    const list = (await (await recs.GET()).json()) as FarmRecommendation[];
    const target = list.find((r) => r.status === "MENUNGGU");
    expect(target).toBeDefined();
    const params = { params: Promise.resolve({ id: target?.id ?? "" }) };

    expect((await validate.PATCH(jsonRequest("PATCH", { decision: "ASAL" }), params)).status).toBe(
      400,
    );

    const missing = await validate.PATCH(jsonRequest("PATCH", { decision: "DITOLAK" }), {
      params: Promise.resolve({ id: "tidak-ada" }),
    });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ message: "Rekomendasi tidak ditemukan." });

    const ok = await validate.PATCH(jsonRequest("PATCH", { decision: "TERVALIDASI" }), params);
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as FarmRecommendation).status).toBe("TERVALIDASI");
  });

  it("GET /api/weather & /api/sensor: 200 dengan bentuk data yang benar bila login", async () => {
    const { weather, sensor } = await loadRoutes();
    as("petani");
    const w = await (await weather.GET()).json();
    expect(w).toHaveProperty("suhu");
    expect(w).toHaveProperty("risiko");
    const s = await (await sensor.GET()).json();
    expect(s).toHaveProperty("kelembapanTanah");
    expect(s).toHaveProperty("statusIrigasi");
  });
});
