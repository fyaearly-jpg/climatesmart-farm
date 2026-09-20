import { afterEach, describe, expect, it, vi } from "vitest";
import { yieldToMain } from "@/lib/perf";

type MutableGlobal = { scheduler?: { yield?: () => Promise<void> } };

describe("yieldToMain (task chunking)", () => {
  afterEach(() => {
    delete (globalThis as MutableGlobal).scheduler;
    vi.useRealTimers();
  });

  it("memakai scheduler.yield() bila browser mendukungnya", async () => {
    const schedulerYield = vi.fn().mockResolvedValue(undefined);
    (globalThis as MutableGlobal).scheduler = { yield: schedulerYield };
    await yieldToMain();
    expect(schedulerYield).toHaveBeenCalledTimes(1);
  });

  it("fallback ke setTimeout(0) bila scheduler.yield tidak tersedia", async () => {
    vi.useFakeTimers();
    let resolved = false;
    const promise = yieldToMain().then(() => {
      resolved = true;
    });
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(0);
    await promise;
    expect(resolved).toBe(true);
  });
});
