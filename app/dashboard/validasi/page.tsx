// app/dashboard/validasi/page.tsx — Server Component async wrapper
//
// Bab 8 (manualChunks equivalent): ValidationTableClient di-load lewat
// next/dynamic — Next.js otomatis memisahkannya ke chunk JS terpisah dari
// bundle utama, dimuat hanya saat rute /dashboard/validasi diakses
// (Penyuluh). Padanan langsung dari rollupOptions.output.manualChunks
// pada vite.config.ts yang tidak berlaku di Next.js (lihat next.config.ts).
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/AsyncUI";
import { getRecommendations } from "@/lib/data/recommendations";

export const metadata: Metadata = { title: "Validasi Penyuluh" };

const ValidationTableClient = dynamic(
  () => import("@/components/modules/ValidationTableClient").then((m) => m.ValidationTableClient),
  { loading: () => <Skeleton lines={6} /> },
);

export default async function ValidasiPage() {
  const data = await getRecommendations();
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <h1 className="mb-1 text-xl font-bold text-stone-800 dark:text-white">
        Validasi Rekomendasi Penyuluh
      </h1>
      <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
        FR-16 — hanya dapat diakses peran Penyuluh (middleware.ts).
      </p>
      <ValidationTableClient initialData={data} />
    </div>
  );
}
