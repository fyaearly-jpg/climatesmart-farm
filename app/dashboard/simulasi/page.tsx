"use client";

// app/dashboard/simulasi/page.tsx
// FR-06 Simulasi Waktu Tanam. Hasil simulasi tidak disimpan di server; petani dapat
// menyimpannya sebagai musim tanam lewat POST /lahan/{id}/musim-tanam.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { PredictionCard } from "@/components/PredictionCard";
import { RiskBadge } from "@/components/RiskBadge";
import { api, getErrorMessage, queryKeys } from "@/lib/api";
import { formatTanggal, hariIniJakarta, RENTANG_SIMULASI_HARI, tambahHari } from "@/lib/date";
import { MusimTanamInputSchema, type Penilaian, SimulasiInputSchema } from "@/lib/schemas";

const PENILAIAN: Record<Penilaian, { judul: string; kelas: string }> = {
  cocok: { judul: "Waktu tanam cocok", kelas: "border-emerald-400 bg-emerald-50 text-emerald-950" },
  hati_hati: {
    judul: "Tanam dengan hati-hati",
    kelas: "border-amber-400 bg-amber-50 text-amber-950",
  },
  tunda: { judul: "Sebaiknya ditunda", kelas: "border-red-400 bg-red-50 text-red-950" },
};

const kelasInput =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700";

export default function SimulasiPage() {
  const queryClient = useQueryClient();
  const hariIni = useMemo(() => hariIniJakarta(), []);
  const maksimal = useMemo(() => tambahHari(hariIni, RENTANG_SIMULASI_HARI), [hariIni]);

  const [idLahanDipilih, setIdLahanDipilih] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [varietas, setVarietas] = useState("");
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [errorVarietas, setErrorVarietas] = useState<string | null>(null);

  const lahanQuery = useQuery({ queryKey: queryKeys.lahan, queryFn: api.lahan.list });
  const idLahan = idLahanDipilih || String(lahanQuery.data?.[0]?.id_lahan ?? "");

  const simulasi = useMutation({ mutationFn: api.simulasi.waktuTanam });
  const simpan = useMutation({
    mutationFn: (v: { id_lahan: number; tanggal_tanam: string; varietas: string }) =>
      api.musimTanam.create(v.id_lahan, { tanggal_tanam: v.tanggal_tanam, varietas: v.varietas }),
    onSuccess: (_data, v) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.musimTanam(v.id_lahan) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.prediksi(v.id_lahan) });
    },
  });

  function jalankanSimulasi(e: FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    simpan.reset();

    const parsed = SimulasiInputSchema.safeParse({
      id_lahan: Number(idLahan),
      tanggal_tanam: tanggal,
    });
    if (!parsed.success) {
      setErrorForm(parsed.error.issues[0]?.message ?? "Input tidak valid");
      return;
    }
    if (tanggal < hariIni || tanggal > maksimal) {
      setErrorForm(
        `Pilih tanggal antara ${formatTanggal(hariIni)} dan ${formatTanggal(maksimal)}. Prakiraan cuaca hanya tersedia ${RENTANG_SIMULASI_HARI} hari ke depan.`,
      );
      return;
    }
    simulasi.mutate(parsed.data);
  }

  function simpanMusimTanam() {
    const hasil = simulasi.data;
    if (!hasil) return;
    setErrorVarietas(null);
    // Memakai id_lahan dan tanggal dari hasil simulasi, bukan dari form,
    // supaya tombol simpan selalu sesuai hasil yang sedang tampil.
    const parsed = MusimTanamInputSchema.safeParse({
      tanggal_tanam: hasil.tanggal_tanam,
      varietas,
    });
    if (!parsed.success) {
      setErrorVarietas(parsed.error.issues[0]?.message ?? "Varietas tidak valid");
      return;
    }
    simpan.mutate({ id_lahan: hasil.id_lahan, ...parsed.data });
  }

  const hasil = simulasi.data;

  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-white">
          Simulasi waktu tanam
        </h1>
        <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
          Lihat perkiraan risiko cuaca, hama, dan penyakit sebelum Anda menanam. Hasil simulasi
          tidak disimpan kecuali Anda memilih menyimpannya.
        </p>
      </header>

      <form
        onSubmit={jalankanSimulasi}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
        noValidate
      >
        {lahanQuery.isPending && (
          <p role="status" className="text-sm text-slate-600">
            Memuat daftar lahan...
          </p>
        )}
        {lahanQuery.isError && (
          <div role="alert" className="text-sm text-red-800">
            {getErrorMessage(lahanQuery.error)}{" "}
            <button type="button" className="underline" onClick={() => void lahanQuery.refetch()}>
              Muat ulang
            </button>
          </div>
        )}
        {lahanQuery.isSuccess && lahanQuery.data.length === 0 && (
          <p className="text-sm text-slate-700">
            Anda belum punya lahan. Tambahkan lahan terlebih dahulu untuk memakai simulasi.
          </p>
        )}

        {lahanQuery.isSuccess && lahanQuery.data.length > 0 && (
          <>
            <div>
              <label htmlFor="lahan" className="text-sm font-medium text-slate-900">
                Lahan
              </label>
              <select
                id="lahan"
                className={kelasInput}
                value={idLahan}
                onChange={(e) => setIdLahanDipilih(e.target.value)}
              >
                {lahanQuery.data.map((l) => (
                  <option key={l.id_lahan} value={l.id_lahan}>
                    {l.nama_lahan}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tanggal" className="text-sm font-medium text-slate-900">
                Rencana tanggal tanam
              </label>
              <input
                id="tanggal"
                type="date"
                className={kelasInput}
                value={tanggal}
                min={hariIni}
                max={maksimal}
                onChange={(e) => setTanggal(e.target.value)}
                aria-describedby="tanggal-bantuan"
              />
              <p id="tanggal-bantuan" className="mt-1 text-xs text-slate-600">
                Bisa dipilih dari hari ini sampai {RENTANG_SIMULASI_HARI} hari ke depan.
              </p>
            </div>
            {errorForm && (
              <p role="alert" className="text-sm text-red-800">
                {errorForm}
              </p>
            )}
            <button
              type="submit"
              disabled={simulasi.isPending}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {simulasi.isPending ? "Menghitung..." : "Jalankan simulasi"}
            </button>
          </>
        )}
      </form>

      <div aria-live="polite" className="space-y-6">
        {simulasi.isError && (
          <p
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
          >
            {getErrorMessage(simulasi.error)}
          </p>
        )}

        {hasil && (
          <>
            <section
              className={`rounded-lg border p-4 ${PENILAIAN[hasil.kesimpulan.penilaian].kelas}`}
            >
              <h2 className="text-lg font-semibold">
                {PENILAIAN[hasil.kesimpulan.penilaian].judul}
              </h2>
              <p className="mt-1 text-sm">{hasil.kesimpulan.pesan}</p>
              <p className="mt-2 text-xs">
                Dinilai untuk {formatTanggal(hasil.jendela.mulai)} sampai{" "}
                {formatTanggal(hasil.jendela.selesai)}. Ini perkiraan indikatif, bukan kepastian.
              </p>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">Risiko cuaca</h2>
                <RiskBadge tingkat={hasil.risiko_cuaca.tingkat} tampilkanPenjelasan />
              </div>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
                {hasil.risiko_cuaca.alasan.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-stone-900 dark:text-white">Penyakit</h2>
              {hasil.penyakit.length === 0 && (
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Tidak ada potensi penyakit yang terdeteksi.
                </p>
              )}
              {hasil.penyakit.map((p) => (
                <PredictionCard key={p.kode} item={p} />
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-stone-900 dark:text-white">Hama</h2>
              {hasil.hama.length === 0 && (
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Tidak ada potensi hama yang terdeteksi.
                </p>
              )}
              {hasil.hama.map((h) => (
                <PredictionCard key={h.kode} item={h} />
              ))}
            </section>

            {hasil.musiman.length > 0 && (
              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-base font-semibold text-slate-900">Kewaspadaan musiman</h2>
                <ul className="mt-2 space-y-1 text-sm text-slate-800">
                  {hasil.musiman.map((m) => (
                    <li key={m.kode}>
                      <span className="font-medium">{m.nama}:</span> {m.pesan}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-base font-semibold text-slate-900">
                Jadi menanam di tanggal ini?
              </h2>
              {simpan.isSuccess ? (
                <p role="status" className="mt-2 text-sm text-emerald-900">
                  Tersimpan sebagai musim tanam {simpan.data.varietas} (tanam{" "}
                  {formatTanggal(simpan.data.tanggal_tanam)}).{" "}
                  <Link href="/dashboard/musim-tanam" className="underline">
                    Lihat musim tanam
                  </Link>
                </p>
              ) : (
                <div className="mt-2 space-y-3">
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
                      aria-invalid={errorVarietas ? true : undefined}
                      aria-describedby={errorVarietas ? "varietas-error" : undefined}
                    />
                    {errorVarietas && (
                      <p id="varietas-error" role="alert" className="mt-1 text-sm text-red-800">
                        {errorVarietas}
                      </p>
                    )}
                  </div>
                  {simpan.isError && (
                    <p role="alert" className="text-sm text-red-800">
                      {getErrorMessage(simpan.error)}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={simpanMusimTanam}
                    disabled={simpan.isPending}
                    className="rounded-md border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    {simpan.isPending ? "Menyimpan..." : "Simpan sebagai musim tanam"}
                  </button>
                  <p className="text-xs text-slate-600">
                    Musim tanam aktif sebelumnya akan menjadi riwayat.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
