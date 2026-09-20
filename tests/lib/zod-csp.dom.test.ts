// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

// Bab k: CSP situs melarang 'unsafe-eval'. Di browser, Zod harus jitless supaya tidak
// menjalankan probe `new Function("")` yang dilaporkan sebagai pelanggaran CSP.
describe("Zod di browser (ada window)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("tidak memanggil `new Function` saat memvalidasi (mode jitless)", async () => {
    vi.resetModules();
    const probes: string[][] = [];
    const Original = Function;
    vi.stubGlobal("Function", function Counting(...args: string[]) {
      probes.push(args);
      return new Original(...args);
    });
    const { PlotRegistrationSchema } = await import("@/lib/schemas");
    const valid = PlotRegistrationSchema.safeParse({
      plotName: "Sawah A",
      commodity: "Padi",
      areaHectare: "2",
      activity: "TANAM",
      scheduledDate: "2026-09-25",
    });
    const invalid = PlotRegistrationSchema.safeParse({ plotName: "a" });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
    expect(probes.filter((args) => args.length === 1 && args[0] === "")).toHaveLength(0);
  });
});
