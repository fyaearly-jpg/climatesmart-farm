import { afterEach, describe, expect, it, vi } from "vitest";

// Pembanding: di server (Node, tanpa `window`) Zod memakai JIT dan MENCOBA `new Function("")`.
// Percobaan inilah yang, di browser dengan CSP tanpa 'unsafe-eval', tercatat sebagai error.
describe("Zod di server (tanpa window)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("melakukan probe `new Function` (JIT aktif) sehingga tes di bawah bisa mendeteksinya", async () => {
    vi.resetModules();
    const probes: string[][] = [];
    const Original = Function;
    vi.stubGlobal("Function", function Counting(...args: string[]) {
      probes.push(args);
      return new Original(...args);
    });
    const { PlotRegistrationSchema } = await import("@/lib/schemas");
    PlotRegistrationSchema.safeParse({
      plotName: "Sawah A",
      commodity: "Padi",
      areaHectare: 1,
      activity: "TANAM",
      scheduledDate: "2026-09-25",
    });
    expect(probes.some((args) => args.length === 1 && args[0] === "")).toBe(true);
  });
});
