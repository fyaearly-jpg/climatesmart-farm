// components/modules/RecommendationsListClient.tsx
//
// Client Component leaf: menerima `initialData` dari Server Component
// (RecommendationsPanel, RSC) supaya paint pertama sudah berisi data asli
// dari server (tidak ada layar "Memuat..." kosong), lalu useRecommendationsQuery
// (Modul 7) mengambil alih untuk cache & refetch berikutnya. Filter
// kategori aktivitas dibaca dari Zustand (Client UI State) dan diterapkan
// secara lokal terhadap data server — pemisahan tegas ala Modul 7.
"use client";

import { useRecommendationsQuery } from "@/hooks/useRecommendationsQuery";
import type { FarmRecommendation } from "@/lib/schemas";
import { type ActivityFilter, useUIStore } from "@/store/useUIStore";
import { EmptyState, ErrorBanner } from "../ui/AsyncUI";
import { ActivityBadge, RiskBadge, StatusBadge } from "../ui/Badge";

const FILTERS: ActivityFilter[] = ["SEMUA", "TANAM", "PUPUK", "SEMPROT", "PANEN"];
const filterLabel: Record<ActivityFilter, string> = {
  SEMUA: "Semua",
  TANAM: "Tanam",
  PUPUK: "Pupuk",
  SEMPROT: "Semprot",
  PANEN: "Panen",
};

export function RecommendationsListClient({ initialData }: { initialData: FarmRecommendation[] }) {
  const query = useRecommendationsQuery(initialData);
  const selectedActivityFilter = useUIStore((s) => s.selectedActivityFilter);
  const setSelectedActivityFilter = useUIStore((s) => s.setSelectedActivityFilter);

  if (query.isError) {
    return (
      <ErrorBanner
        message={query.error instanceof Error ? query.error.message : "Gagal memuat rekomendasi."}
        onRetry={() => query.refetch()}
      />
    );
  }

  const filtered = query.data.filter((r) =>
    selectedActivityFilter === "SEMUA" ? true : r.activity === selectedActivityFilter,
  );

  return (
    <div>
      <fieldset
        className="mb-4 flex flex-wrap gap-2 border-0 p-0"
        aria-label="Filter kategori aktivitas"
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={f === selectedActivityFilter}
            onClick={() => setSelectedActivityFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              f === selectedActivityFilter
                ? "bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-white/10 dark:text-stone-300"
            }`}
          >
            {filterLabel[f]}
          </button>
        ))}
      </fieldset>

      {filtered.length === 0 ? (
        <EmptyState
          message={
            selectedActivityFilter === "SEMUA"
              ? "Belum ada rekomendasi jadwal aktivitas."
              : `Tidak ada rekomendasi untuk kategori "${filterLabel[selectedActivityFilter]}".`
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-stone-200 bg-white/70 p-4 transition hover:shadow-md dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-stone-800 dark:text-white">{r.plotName}</strong>
                  <span className="text-stone-500 dark:text-stone-400"> — {r.commodity}</span>
                </div>
                <time
                  dateTime={r.scheduledDate}
                  className="text-xs text-stone-500 dark:text-stone-400"
                >
                  {r.scheduledDate}
                </time>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <ActivityBadge activity={r.activity} />
                <RiskBadge risk={r.riskLevel} />
                <StatusBadge status={r.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
