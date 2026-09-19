// app/dashboard/loading.tsx — Streaming SSR fallback (Modul 6, Bagian E)
import { Skeleton } from "@/components/ui/AsyncUI";

export default function DashboardLoading() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900">
        <Skeleton lines={4} />
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900">
        <Skeleton lines={4} />
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900 md:col-span-2">
        <Skeleton lines={6} />
      </div>
    </div>
  );
}
