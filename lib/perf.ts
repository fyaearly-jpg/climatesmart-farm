// lib/perf.ts — Bab j (Core Web Vitals / INP): Task Chunking dengan scheduler.yield()
//
// INP (Interaction to Next Paint, target <= 200ms) memburuk saat satu event handler
// memblokir main thread terlalu lama. `scheduler.yield()` melepas main thread agar
// browser sempat menggambar ulang / memproses input lain, lalu melanjutkan pekerjaan
// dengan prioritas tinggi (berbeda dari setTimeout yang antre di belakang task lain).
// Browser tanpa scheduler.yield (mis. Firefox/Safari lama) memakai setTimeout(0).

type SchedulerWithYield = { yield?: () => Promise<void> };

export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: SchedulerWithYield }).scheduler;
  if (typeof scheduler?.yield === "function") {
    return scheduler.yield();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
