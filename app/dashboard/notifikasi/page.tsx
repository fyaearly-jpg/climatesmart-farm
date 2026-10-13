"use client";

// app/dashboard/notifikasi/page.tsx
// FR-10 Kotak Masuk. Notifikasi hama dan penyakit berisiko tinggi datang dalam dua tahap:
// tahap 1 pesan waspada netral (langsung), tahap 2 saran pengendalian (setelah penyuluh memvalidasi).

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, getErrorMessage, queryKeys } from "@/lib/api";
import { formatTanggal } from "@/lib/date";
import type { TahapNotifikasi } from "@/lib/schemas";

const TAHAP: Record<TahapNotifikasi, { judul: string; arti: string; kelas: string }> = {
  waspada: {
    judul: "Peringatan awal",
    arti: "Tahap 1: pesan waspada, periksa lahan Anda",
    kelas: "border-amber-300 bg-amber-50 text-amber-950",
  },
  saran: {
    judul: "Saran pengendalian",
    arti: "Tahap 2: saran dari penyuluh",
    kelas: "border-emerald-300 bg-emerald-50 text-emerald-950",
  },
  info: {
    judul: "Informasi",
    arti: "Pemberitahuan umum",
    kelas: "border-slate-300 bg-slate-50 text-slate-900",
  },
};

type Filter = "semua" | "belum";

export default function NotifikasiPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("semua");
  const [page, setPage] = useState(1);

  const dibaca = filter === "belum" ? false : undefined;
  const daftar = useQuery({
    queryKey: queryKeys.notifikasi(dibaca, page),
    queryFn: () => api.notifikasi.list({ page, ...(dibaca === false ? { dibaca } : {}) }),
    placeholderData: keepPreviousData,
  });

  const tandai = useMutation({
    mutationFn: (id: number) => api.notifikasi.baca(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifikasi"] }),
  });

  function ubahFilter(baru: Filter) {
    setFilter(baru);
    setPage(1);
  }

  const total = daftar.data?.meta.total ?? 0;
  const perHalaman = daftar.data?.meta.per_page ?? 20;
  const totalHalaman = Math.max(1, Math.ceil(total / perHalaman));

  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-white">Kotak masuk</h1>
        <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
          Peringatan hama dan penyakit untuk lahan Anda. Untuk risiko tinggi, peringatan awal datang
          lebih dulu, disusul saran pengendalian setelah divalidasi penyuluh.
        </p>
      </header>

      <fieldset
        className="flex min-w-0 flex-wrap items-center gap-2 border-0 p-0"
        aria-label="Filter notifikasi"
      >
        {(["semua", "belum"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => ubahFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
              filter === f
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            {f === "semua" ? "Semua" : "Belum dibaca"}
          </button>
        ))}
        {daftar.isSuccess && filter === "belum" && (
          <span className="text-sm text-stone-700 dark:text-stone-300">{total} belum dibaca</span>
        )}
      </fieldset>

      {tandai.isError && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        >
          {getErrorMessage(tandai.error)}
        </p>
      )}

      {daftar.isPending && (
        <p role="status" className="text-sm text-stone-600 dark:text-stone-400">
          Memuat notifikasi...
        </p>
      )}

      {daftar.isError && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        >
          <p>{getErrorMessage(daftar.error)}</p>
          <button type="button" className="mt-1 underline" onClick={() => void daftar.refetch()}>
            Coba lagi
          </button>
        </div>
      )}

      {daftar.isSuccess && daftar.data.data.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-700">
          {filter === "belum" ? "Semua notifikasi sudah dibaca." : "Belum ada notifikasi."}
        </p>
      )}

      {daftar.isSuccess && daftar.data.data.length > 0 && (
        <ul className="space-y-3">
          {daftar.data.data.map((n) => {
            const t = TAHAP[n.tahap];
            return (
              <li key={n.id_notifikasi}>
                <article
                  className={`min-w-0 rounded-lg border bg-white p-4 ${n.dibaca ? "border-slate-200" : "border-emerald-500"}`}
                >
                  <header className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded border px-2 py-0.5 text-xs font-semibold ${t.kelas}`}
                      title={t.arti}
                    >
                      {t.judul}
                    </span>
                    {!n.dibaca && (
                      <span className="text-xs font-semibold text-emerald-800">Baru</span>
                    )}
                    <time dateTime={n.tanggal} className="ml-auto text-xs text-slate-600">
                      {formatTanggal(n.tanggal)}
                    </time>
                  </header>
                  <p className="mt-2 text-sm text-slate-900">{n.pesan}</p>
                  {n.status_kirim === "belum_terkirim" && (
                    <p className="mt-1 text-xs text-slate-600">
                      Belum terkirim ke WhatsApp. Pesan tetap tersimpan di kotak masuk ini.
                    </p>
                  )}
                  {!n.dibaca && (
                    <button
                      type="button"
                      disabled={tandai.isPending && tandai.variables === n.id_notifikasi}
                      onClick={() => tandai.mutate(n.id_notifikasi)}
                      aria-label={`Tandai dibaca: ${t.judul}, ${formatTanggal(n.tanggal)}`}
                      className="mt-3 rounded-md border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                      Tandai dibaca
                    </button>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {daftar.isSuccess && totalHalaman > 1 && (
        <nav aria-label="Halaman notifikasi" className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 disabled:opacity-50 hover:bg-slate-50"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-stone-700 dark:text-stone-300">
            Halaman {page} dari {totalHalaman}
          </span>
          <button
            type="button"
            disabled={page >= totalHalaman}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 disabled:opacity-50 hover:bg-slate-50"
          >
            Berikutnya
          </button>
        </nav>
      )}
    </main>
  );
}
