// app/dashboard/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RecommendationsPanel } from "@/components/panels/RecommendationsPanel";
import { SensorPanel } from "@/components/panels/SensorPanel";
import { WeatherPanel } from "@/components/panels/WeatherPanel";
import { Skeleton } from "@/components/ui/AsyncUI";
import { getRecommendations } from "@/lib/data/recommendations";
import { getUserStats } from "@/lib/data/users";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

const deniedLabel: Record<string, string> = {
  petani: "Petani",
  penyuluh: "Penyuluh",
  admin: "Admin",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <h2 className="mb-4 font-semibold text-stone-800 dark:text-white">{title}</h2>
      {children}
    </div>
  );
}

async function PenyuluhSummary() {
  const data = await getRecommendations();
  const pending = data.filter((r) => r.status === "MENUNGGU").length;
  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white shadow-xl">
      <p className="text-sm text-brand-100">Rekomendasi menunggu validasi Anda</p>
      <p className="mt-1 text-4xl font-extrabold">{pending}</p>
      <Link
        href="/dashboard/validasi"
        className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand-800 shadow hover:-translate-y-0.5 transition"
      >
        Buka Halaman Validasi →
      </Link>
    </div>
  );
}

async function AdminSummary() {
  const stats = await getUserStats();
  const cards = [
    { label: "Total Pengguna", value: stats.total },
    { label: "Petani", value: stats.petani },
    { label: "Penyuluh", value: stats.penyuluh },
    { label: "Admin", value: stats.admin },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
        >
          <p className="text-xs text-stone-500 dark:text-stone-400">{c.label}</p>
          <p className="mt-1 text-3xl font-extrabold text-brand-700 dark:text-brand-300">
            {c.value}
          </p>
        </div>
      ))}
      <Link
        href="/dashboard/admin"
        className="sm:col-span-2 lg:col-span-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-center font-semibold text-white shadow-lg hover:-translate-y-0.5 transition"
      >
        Kelola Pengguna →
      </Link>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  const session = await getSession();
  const role = session?.role;
  const name = session?.name ?? "";

  return (
    <div className="flex flex-col gap-6">
      {denied && (
        <p
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          Halaman itu khusus peran {deniedLabel[denied] ?? "lain"} Anda dialihkan kembali ke
          Dashboard.
        </p>
      )}

      <div>
        <h1 className="text-2xl font-bold text-stone-800 dark:text-white">
          Halo, {name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Ringkasan ClimateSmart Farm untuk peran {role}.
        </p>
      </div>

      {role === "petani" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Panel title="Cuaca Real-Time">
            <Suspense fallback={<Skeleton lines={4} />}>
              <WeatherPanel />
            </Suspense>
          </Panel>
          <Panel title="Sensor IoT Kelembapan Lahan">
            <Suspense fallback={<Skeleton lines={3} />}>
              <SensorPanel />
            </Suspense>
          </Panel>
          <div className="md:col-span-2">
            <Panel title="Rekomendasi Jadwal Aktivitas (AI Recommendation Engine)">
              <Suspense fallback={<Skeleton lines={5} />}>
                <RecommendationsPanel />
              </Suspense>
            </Panel>
          </div>
        </div>
      )}

      {role === "penyuluh" && (
        <Suspense fallback={<Skeleton lines={4} />}>
          <PenyuluhSummary />
        </Suspense>
      )}

      {role === "admin" && (
        <Suspense fallback={<Skeleton lines={4} />}>
          <AdminSummary />
        </Suspense>
      )}
    </div>
  );
}
