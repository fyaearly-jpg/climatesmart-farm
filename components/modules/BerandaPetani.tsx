"use client";

// components/modules/BerandaPetani.tsx
// Beranda Petani: cuaca terkini dan prakiraan, fase musim tanam, jadwal SRI IPB, serta prediksi
// hama dan penyakit lengkap dengan faktor pemicunya (NFR-08). Data diambil di sisi klien dari API
// backend lewat proxy cookie httpOnly, bukan dari data tiruan lokal.

import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { GrowthTimeline } from "@/components/GrowthTimeline";
import { PredictionCard } from "@/components/PredictionCard";
import { RiskBadge } from "@/components/RiskBadge";
import { api, getErrorMessage, queryKeys } from "@/lib/api";
import { formatTanggal, formatTanggalPendek } from "@/lib/date";
import type {
  Aktivitas,
  Cuaca,
  Lahan,
  Prediksi,
  PrediksiOpt,
  StatusJadwal,
  Tingkat,
} from "@/lib/schemas";

const AKTIVITAS: Record<Aktivitas, string> = {
  tanam: "Tanam",
  pemupukan: "Pemupukan",
  penyemprotan: "Penyemprotan",
  panen: "Panen",
};

const STATUS_JADWAL: Record<StatusJadwal, { label: string; kelas: string }> = {
  direkomendasikan: {
    label: "Disarankan",
    kelas: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
  ditunda: { label: "Ditunda", kelas: "border-amber-300 bg-amber-50 text-amber-900" },
  siaga: { label: "Siaga", kelas: "border-red-300 bg-red-50 text-red-900" },
};

const URUTAN_RISIKO: Record<Tingkat, number> = { tinggi: 0, sedang: 1, rendah: 2 };

const redup = "text-stone-500 dark:text-stone-400";
const angka = (n: number, desimal = 1) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: desimal }).format(n);
const persen = (p: number) => `${Math.round(p * 100)}%`;

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 ${className}`}
    >
      <h2 className="mb-4 font-semibold text-stone-800 dark:text-white">{title}</h2>
      {children}
    </section>
  );
}

/** Menangani keadaan memuat dan galat untuk satu query, supaya tiap panel gagal sendiri-sendiri. */
function Isi<T>({
  q,
  children,
}: {
  q: UseQueryResult<T, Error>;
  children: (data: T) => ReactNode;
}) {
  if (q.isPending)
    return (
      <p role="status" className={`text-sm ${redup}`}>
        Memuat...
      </p>
    );
  if (q.isError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
      >
        <p>{getErrorMessage(q.error)}</p>
        <button type="button" onClick={() => void q.refetch()} className="mt-1 underline">
          Coba lagi
        </button>
      </div>
    );
  }
  return <>{children(q.data)}</>;
}

function Metrik({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div>
      <dt className={`text-xs ${redup}`}>{label}</dt>
      <dd className="text-base font-semibold text-stone-800 dark:text-white">{nilai}</dd>
    </div>
  );
}

function CuacaIsi({ cuaca }: { cuaca: Cuaca }) {
  const t = cuaca.terkini;
  const diperbarui = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(cuaca.diperbarui));
  return (
    <>
      <p className={`text-xs ${redup}`}>Diperbarui {diperbarui} WIB</p>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metrik label="Suhu" nilai={`${angka(t.suhu)}°C`} />
        <Metrik label="Kelembapan Udara" nilai={`${angka(t.kelembapan_udara, 0)}%`} />
        <Metrik label="Curah Hujan" nilai={`${angka(t.curah_hujan)} mm`} />
        <Metrik label="Angin" nilai={`${angka(t.kecepatan_angin)} km/jam`} />
        <Metrik label="Suhu Tanah" nilai={`${angka(t.suhu_tanah)}°C`} />
        <Metrik label="Kelembapan Tanah" nilai={angka(t.kelembapan_tanah, 2)} />
      </dl>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[26rem] text-left text-sm">
          <caption className="mb-1 text-left text-sm font-medium text-stone-700 dark:text-stone-200">
            Prakiraan 7 hari
          </caption>
          <thead className={`text-xs ${redup}`}>
            <tr>
              <th scope="col" className="py-1 pr-3 font-medium">
                Hari
              </th>
              <th scope="col" className="py-1 pr-3 font-medium">
                Suhu
              </th>
              <th scope="col" className="py-1 pr-3 font-medium">
                Hujan
              </th>
              <th scope="col" className="py-1 font-medium">
                Kelembapan
              </th>
            </tr>
          </thead>
          <tbody className="text-stone-800 dark:text-stone-100">
            {cuaca.prakiraan_harian.slice(0, 7).map((h) => (
              <tr key={h.tanggal} className="border-t border-stone-200 dark:border-white/10">
                <th scope="row" className="py-1.5 pr-3 font-normal">
                  {formatTanggalPendek(h.tanggal)}
                </th>
                <td className="py-1.5 pr-3">
                  {angka(h.suhu_min, 0)} sampai {angka(h.suhu_maks, 0)}°C
                </td>
                <td className="py-1.5 pr-3">{angka(h.curah_hujan_total)} mm</td>
                <td className="py-1.5">{angka(h.kelembapan_rata, 0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FaseIsi({ prediksi }: { prediksi: Prediksi }) {
  const risiko = prediksi.risiko_cuaca;
  const p = risiko.probabilitas;
  return (
    <>
      {prediksi.fase ? (
        <GrowthTimeline
          hst={prediksi.fase.hst}
          fase={prediksi.fase.fase}
          tanggalTanam={prediksi.fase.tanggal_tanam}
          varietas={prediksi.fase.varietas}
        />
      ) : (
        <p className="text-sm text-stone-700 dark:text-stone-300">
          Belum ada musim tanam aktif untuk lahan ini.{" "}
          <Link href="/dashboard/musim-tanam" className="font-semibold underline">
            Catat musim tanam sekarang
          </Link>
        </p>
      )}
      <div className="mt-5 border-t border-stone-200 pt-4 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-stone-800 dark:text-stone-100">Risiko cuaca</h3>
          <RiskBadge tingkat={risiko.tingkat} tampilkanPenjelasan />
        </div>
        <p className={`mt-1 text-xs ${redup}`}>
          Peluang risiko: rendah {persen(p.rendah)}, sedang {persen(p.sedang)}, tinggi{" "}
          {persen(p.tinggi)}
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm text-stone-700 dark:text-stone-300">
          {risiko.alasan.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

function JadwalIsi({ prediksi }: { prediksi: Prediksi }) {
  const jadwal = [...prediksi.jadwal].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  if (jadwal.length === 0) return <p className={`text-sm ${redup}`}>Belum ada jadwal aktivitas.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {jadwal.map((j) => {
        const s = STATUS_JADWAL[j.status];
        return (
          <li
            key={j.id_rekomendasi}
            className="rounded-xl border border-stone-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-stone-800 dark:text-white">{AKTIVITAS[j.aktivitas]}</strong>
              <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${s.kelas}`}>
                {s.label}
              </span>
              <time dateTime={j.tanggal} className={`ml-auto text-xs ${redup}`}>
                {formatTanggal(j.tanggal)}
              </time>
            </div>
            <ul className="mt-1 list-disc pl-5 text-sm text-stone-700 dark:text-stone-300">
              {j.alasan.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            {j.status_validasi === "menunggu" && (
              <p className={`mt-1 text-xs ${redup}`}>Menunggu validasi penyuluh.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function OptIsi({ prediksi }: { prediksi: Prediksi }) {
  const semua: PrediksiOpt[] = [...prediksi.penyakit, ...prediksi.hama].sort(
    (a, b) => URUTAN_RISIKO[a.tingkat] - URUTAN_RISIKO[b.tingkat],
  );
  return (
    <>
      {semua.length === 0 ? (
        <p className={`text-sm ${redup}`}>
          Tidak ada potensi hama atau penyakit yang terdeteksi saat ini.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {semua.map((o) => (
            <PredictionCard key={o.kode} item={o} />
          ))}
        </div>
      )}
      {prediksi.musiman.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-stone-700 dark:text-stone-300">
          {prediksi.musiman.map((m) => (
            <li key={m.kode}>
              <span className="font-medium">{m.nama}:</span> {m.pesan}
            </li>
          ))}
        </ul>
      )}
      <p className={`mt-4 text-xs ${redup}`}>
        Prediksi bersifat indikatif dan dihitung dari prakiraan cuaca, bukan kepastian di lapangan.
      </p>
    </>
  );
}

function DashboardLahan({ lahan }: { lahan: Lahan }) {
  const id = lahan.id_lahan;
  const cuaca = useQuery({
    queryKey: queryKeys.cuaca(id),
    queryFn: () => api.lahan.cuaca(id),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const prediksi = useQuery({
    queryKey: queryKeys.prediksi(id),
    queryFn: () => api.lahan.prediksi(id),
    staleTime: 60_000,
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Cuaca Terkini">
        <Isi q={cuaca}>{(c) => <CuacaIsi cuaca={c} />}</Isi>
      </Panel>
      <Panel title="Fase Musim Tanam">
        <Isi q={prediksi}>{(p) => <FaseIsi prediksi={p} />}</Isi>
      </Panel>
      <Panel title="Jadwal Aktivitas (SRI IPB)">
        <Isi q={prediksi}>{(p) => <JadwalIsi prediksi={p} />}</Isi>
      </Panel>
      <Panel title="Risiko Hama dan Penyakit">
        <Isi q={prediksi}>{(p) => <OptIsi prediksi={p} />}</Isi>
      </Panel>
    </div>
  );
}

const kelasPintasan =
  "rounded-full border border-brand-300 px-3.5 py-1.5 text-xs font-semibold text-brand-800 transition hover:bg-brand-50 dark:border-white/20 dark:text-brand-200 dark:hover:bg-white/10";

export function BerandaPetani() {
  const [dipilih, setDipilih] = useState("");
  const lahanQuery = useQuery({ queryKey: queryKeys.lahan, queryFn: api.lahan.list });

  if (lahanQuery.isPending)
    return (
      <p role="status" className={`text-sm ${redup}`}>
        Memuat lahan...
      </p>
    );
  if (lahanQuery.isError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
      >
        <p>{getErrorMessage(lahanQuery.error)}</p>
        <button type="button" onClick={() => void lahanQuery.refetch()} className="mt-1 underline">
          Coba lagi
        </button>
      </div>
    );
  }

  const daftar = lahanQuery.data;
  const lahan = daftar.find((l) => String(l.id_lahan) === dipilih) ?? daftar[0];
  if (!lahan) {
    return (
      <Panel title="Belum ada lahan">
        <p className="text-sm text-stone-700 dark:text-stone-300">
          Daftarkan lahan Anda terlebih dahulu untuk melihat cuaca, jadwal, dan prediksi.{" "}
          <Link href="/dashboard/tambah-lahan" className="font-semibold underline">
            Daftarkan lahan
          </Link>
        </p>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {daftar.length > 1 ? (
            <>
              <label
                htmlFor="lahan-aktif"
                className="text-sm font-medium text-stone-700 dark:text-stone-200"
              >
                Lahan aktif
              </label>
              <select
                id="lahan-aktif"
                value={String(lahan.id_lahan)}
                onChange={(e) => setDipilih(e.target.value)}
                className="mt-1 block h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
              >
                {daftar.map((l) => (
                  <option key={l.id_lahan} value={l.id_lahan}>
                    {l.nama_lahan}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p className="text-sm text-stone-700 dark:text-stone-200">
              Lahan: <strong>{lahan.nama_lahan}</strong>
            </p>
          )}
        </div>
        <nav aria-label="Pintasan petani" className="flex flex-wrap gap-2">
          <Link href="/dashboard/simulasi" className={kelasPintasan}>
            Simulasi tanam
          </Link>
          <Link href="/dashboard/musim-tanam" className={kelasPintasan}>
            Musim tanam
          </Link>
          <Link href="/dashboard/notifikasi" className={kelasPintasan}>
            Kotak masuk
          </Link>
        </nav>
      </div>
      <DashboardLahan key={lahan.id_lahan} lahan={lahan} />
    </div>
  );
}
