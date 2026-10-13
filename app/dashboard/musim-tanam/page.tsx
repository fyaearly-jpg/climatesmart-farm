"use client";

// app/dashboard/musim-tanam/page.tsx
// FR-05 Catat Musim Tanam: tanggal tanam riil dan varietas. Hanya satu musim tanam aktif per lahan;
// mencatat yang baru otomatis menjadikan yang lama riwayat (diatur backend).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";
import { GrowthTimeline } from "@/components/GrowthTimeline";
import { api, getErrorMessage, queryKeys } from "@/lib/api";
import { formatTanggal, hariIniJakarta } from "@/lib/date";
import { type MusimTanam, type MusimTanamInput, MusimTanamInputSchema } from "@/lib/schemas";

const kelasInput =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700";

interface GalatForm {
  tanggal?: string;
  varietas?: string;
}

export default function MusimTanamPage() {
  const queryClient = useQueryClient();
  const hariIni = useMemo(() => hariIniJakarta(), []);

  const [idLahanDipilih, setIdLahanDipilih] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [varietas, setVarietas] = useState("");
  const [galat, setGalat] = useState<GalatForm>({});
  const [berhasil, setBerhasil] = useState<MusimTanam | null>(null);

  const lahanQuery = useQuery({ queryKey: queryKeys.lahan, queryFn: api.lahan.list });
  const idLahan = Number(idLahanDipilih || lahanQuery.data?.[0]?.id_lahan || 0);

  const musimQuery = useQuery({
    queryKey: queryKeys.musimTanam(idLahan),
    queryFn: () => api.musimTanam.list(idLahan),
    enabled: idLahan > 0,
  });
  const aktif = musimQuery.data?.find((m) => m.aktif);
  const riwayat = musimQuery.data?.filter((m) => !m.aktif) ?? [];

  const simpan = useMutation({
    mutationFn: (input: MusimTanamInput) => api.musimTanam.create(idLahan, input),
    onSuccess: (musim) => {
      setBerhasil(musim);
      setVarietas("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.musimTanam(idLahan) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.prediksi(idLahan) });
    },
  });

  function kirim(e: FormEvent) {
    e.preventDefault();
    setBerhasil(null);
    simpan.reset();

    const baru: GalatForm = {};
    if (!tanggal) baru.tanggal = "Tanggal tanam wajib diisi.";
    else if (tanggal > hariIni) {
      baru.tanggal =
        "Tanggal tanam riil tidak boleh di masa depan. Untuk rencana, gunakan Simulasi waktu tanam.";
    }
    const parsed = MusimTanamInputSchema.safeParse({ tanggal_tanam: tanggal, varietas });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "varietas") baru.varietas ??= issue.message;
      }
    }
    setGalat(baru);
    if (!parsed.success || baru.tanggal || baru.varietas) return;
    simpan.mutate(parsed.data);
  }

  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-white">Musim tanam</h1>
        <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
          Catat tanggal tanam yang sebenarnya dan varietas padi. Sistem memakainya untuk menghitung
          fase tumbuh dan risiko hama serta penyakit.
        </p>
      </header>

      {lahanQuery.isPending && (
        <p role="status" className="text-sm text-stone-600 dark:text-stone-400">
          Memuat daftar lahan...
        </p>
      )}
      {lahanQuery.isError && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        >
          {getErrorMessage(lahanQuery.error)}{" "}
          <button type="button" className="underline" onClick={() => void lahanQuery.refetch()}>
            Muat ulang
          </button>
        </div>
      )}
      {lahanQuery.isSuccess && lahanQuery.data.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          Anda belum punya lahan. Tambahkan lahan terlebih dahulu untuk mencatat musim tanam.
        </p>
      )}

      {lahanQuery.isSuccess && lahanQuery.data.length > 0 && (
        <>
          <div>
            <label htmlFor="lahan" className="text-sm font-medium text-stone-900 dark:text-white">
              Lahan
            </label>
            <select
              id="lahan"
              className={kelasInput}
              value={String(idLahan)}
              onChange={(e) => {
                setIdLahanDipilih(e.target.value);
                setBerhasil(null);
              }}
            >
              {lahanQuery.data.map((l) => (
                <option key={l.id_lahan} value={l.id_lahan}>
                  {l.nama_lahan}
                </option>
              ))}
            </select>
          </div>

          <section
            aria-labelledby="judul-aktif"
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <h2 id="judul-aktif" className="text-base font-semibold text-slate-900">
              Musim tanam aktif
            </h2>
            {musimQuery.isPending && (
              <p role="status" className="mt-2 text-sm text-slate-600">
                Memuat musim tanam...
              </p>
            )}
            {musimQuery.isError && (
              <p role="alert" className="mt-2 text-sm text-red-800">
                {getErrorMessage(musimQuery.error)}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => void musimQuery.refetch()}
                >
                  Coba lagi
                </button>
              </p>
            )}
            {musimQuery.isSuccess && !aktif && (
              <p className="mt-2 text-sm text-slate-700">
                Belum ada musim tanam aktif untuk lahan ini. Catat yang pertama di formulir di
                bawah.
              </p>
            )}
            {aktif && (
              <GrowthTimeline
                className="mt-3"
                hst={aktif.hst}
                fase={aktif.fase}
                tanggalTanam={aktif.tanggal_tanam}
                varietas={aktif.varietas}
              />
            )}
          </section>

          <section
            aria-labelledby="judul-form"
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <h2 id="judul-form" className="text-base font-semibold text-slate-900">
              Catat musim tanam baru
            </h2>
            {aktif && (
              <p className="mt-1 text-sm text-slate-700">
                Musim tanam aktif saat ini ({aktif.varietas}, tanam{" "}
                {formatTanggal(aktif.tanggal_tanam)}) akan menjadi riwayat.
              </p>
            )}
            <form onSubmit={kirim} className="mt-3 space-y-4" noValidate>
              <div>
                <label htmlFor="tanggal" className="text-sm font-medium text-slate-900">
                  Tanggal tanam
                </label>
                <input
                  id="tanggal"
                  type="date"
                  className={kelasInput}
                  value={tanggal}
                  max={hariIni}
                  onChange={(e) => setTanggal(e.target.value)}
                  aria-invalid={galat.tanggal ? true : undefined}
                  aria-describedby={galat.tanggal ? "tanggal-error" : undefined}
                />
                {galat.tanggal && (
                  <p id="tanggal-error" role="alert" className="mt-1 text-sm text-red-800">
                    {galat.tanggal}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="varietas" className="text-sm font-medium text-slate-900">
                  Varietas padi
                </label>
                <input
                  id="varietas"
                  className={kelasInput}
                  placeholder="Contoh: Inpari 32"
                  value={varietas}
                  onChange={(e) => setVarietas(e.target.value)}
                  aria-invalid={galat.varietas ? true : undefined}
                  aria-describedby={galat.varietas ? "varietas-error" : undefined}
                />
                {galat.varietas && (
                  <p id="varietas-error" role="alert" className="mt-1 text-sm text-red-800">
                    {galat.varietas}
                  </p>
                )}
              </div>

              {simpan.isError && (
                <p
                  role="alert"
                  className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
                >
                  {getErrorMessage(simpan.error)}
                </p>
              )}
              {berhasil && (
                <p
                  role="status"
                  className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950"
                >
                  Tersimpan: {berhasil.varietas}, tanam {formatTanggal(berhasil.tanggal_tanam)}.
                </p>
              )}

              <button
                type="submit"
                disabled={simpan.isPending}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                {simpan.isPending ? "Menyimpan..." : "Simpan musim tanam"}
              </button>
            </form>
          </section>

          <section
            aria-labelledby="judul-riwayat"
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <h2 id="judul-riwayat" className="text-base font-semibold text-slate-900">
              Riwayat musim tanam
            </h2>
            {musimQuery.isSuccess && riwayat.length === 0 && (
              <p className="mt-2 text-sm text-slate-600">Belum ada riwayat musim tanam.</p>
            )}
            {riwayat.length > 0 && (
              <ul className="mt-2 divide-y divide-slate-100">
                {riwayat.map((m) => (
                  <li key={m.id_musim_tanam} className="py-2 text-sm text-slate-800">
                    <span className="font-medium">{m.varietas}</span>, tanam{" "}
                    {formatTanggal(m.tanggal_tanam)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
