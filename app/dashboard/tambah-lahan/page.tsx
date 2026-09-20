// app/dashboard/tambah-lahan/page.tsx — Server Component wrapper (Metadata + heading)
import type { Metadata } from "next";
import { FormEntryClient } from "@/components/modules/FormEntryClient";

export const metadata: Metadata = { title: "Tambah Lahan" };

export default function TambahLahanPage() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <h1 className="mb-1 text-xl font-bold text-stone-800 dark:text-white">
        Pendaftaran Lahan &amp; Tambah Aktivitas
      </h1>
      <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
        divalidasi Zod sebelum dikirim.
      </p>
      <FormEntryClient />
    </div>
  );
}
