// components/modules/ValidationTableClient.tsx — Client leaf (Modul 5/7, Tailwind v4)
"use client";

import {
  useRecommendationsQuery,
  useValidateRecommendationMutation,
} from "@/hooks/useRecommendationsQuery";
import type { FarmRecommendation } from "@/lib/schemas";
import { EmptyState, ErrorBanner, Skeleton } from "../ui/AsyncUI";
import { ActivityBadge, RiskBadge, StatusBadge } from "../ui/Badge";
import { Button } from "../ui/Button";

export function ValidationTableClient({ initialData }: { initialData: FarmRecommendation[] }) {
  const query = useRecommendationsQuery(initialData);
  const validateMutation = useValidateRecommendationMutation();

  if (query.isLoading) return <Skeleton lines={6} />;
  if (query.isError) {
    return (
      <ErrorBanner
        message={query.error instanceof Error ? query.error.message : "Gagal memuat data."}
        onRetry={() => query.refetch()}
      />
    );
  }

  const pending = query.data.filter((r) => r.status === "MENUNGGU");

  function isRowBusy(id: string) {
    return validateMutation.isPending && validateMutation.variables?.id === id;
  }

  if (pending.length === 0) {
    return <EmptyState message="Tidak ada rekomendasi yang menunggu validasi." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {pending.map((r) => {
        const busy = isRowBusy(r.id);
        const rowFailed = validateMutation.isError && validateMutation.variables?.id === r.id;
        return (
          <li
            key={r.id}
            className="rounded-xl border border-stone-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong className="text-stone-800 dark:text-white">{r.plotName}</strong>
                <span className="text-stone-500 dark:text-stone-400"> — {r.commodity}</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ActivityBadge activity={r.activity} />
                  <RiskBadge risk={r.riskLevel} />
                  <StatusBadge status={r.status} />
                </div>
                <time
                  dateTime={r.scheduledDate}
                  className="mt-1 block text-xs text-stone-500 dark:text-stone-400"
                >
                  {r.scheduledDate}
                </time>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  aria-busy={busy}
                  onClick={() => validateMutation.mutate({ id: r.id, decision: "TERVALIDASI" })}
                >
                  {busy ? "Memproses…" : "Setujui"}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  aria-busy={busy}
                  onClick={() => validateMutation.mutate({ id: r.id, decision: "DITOLAK" })}
                >
                  Tolak
                </Button>
              </div>
            </div>
            {rowFailed && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {validateMutation.error instanceof Error
                  ? validateMutation.error.message
                  : "Gagal memproses validasi."}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
