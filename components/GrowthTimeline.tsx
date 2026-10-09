// components/GrowthTimeline.tsx
// Garis waktu perkembangan padi berdasarkan HST dan fase (KONTRAK: awal <= 14, vegetatif 15-55,
// generatif > 55). Lebar segmen sebanding dengan lamanya fase. Penanda bergeser sesuai HST.
// Bisa dipakai sebagai Server Component (tanpa state).

import { formatTanggal } from "@/lib/date";
import { BATAS_HST, type Fase } from "@/lib/schemas";

/** Panjang garis waktu yang ditampilkan; generatif dipotong di sini agar skala tetap terbaca. */
const HST_TAMPIL = 110;

const FASE: {
  kode: Fase;
  nama: string;
  rentang: string;
  arti: string;
  mulai: number;
  akhir: number;
}[] = [
  {
    kode: "awal",
    nama: "Awal",
    rentang: `0 sampai ${BATAS_HST.awal} HST`,
    arti: "Bibit tumbuh dan beradaptasi",
    mulai: 0,
    akhir: BATAS_HST.awal,
  },
  {
    kode: "vegetatif",
    nama: "Vegetatif",
    rentang: `${BATAS_HST.awal + 1} sampai ${BATAS_HST.vegetatif} HST`,
    arti: "Anakan bertambah",
    mulai: BATAS_HST.awal,
    akhir: BATAS_HST.vegetatif,
  },
  {
    kode: "generatif",
    nama: "Generatif",
    rentang: `lebih dari ${BATAS_HST.vegetatif} HST`,
    arti: "Berbunga dan mengisi bulir",
    mulai: BATAS_HST.vegetatif,
    akhir: HST_TAMPIL,
  },
];

export interface GrowthTimelineProps {
  hst: number;
  fase: Fase;
  tanggalTanam?: string;
  varietas?: string;
  className?: string;
}

export function GrowthTimeline({
  hst,
  fase,
  tanggalTanam,
  varietas,
  className = "",
}: GrowthTimelineProps) {
  const posisi = Math.min(Math.max(hst / HST_TAMPIL, 0), 1) * 100;
  const aktif = FASE.find((f) => f.kode === fase);

  return (
    <section className={`min-w-0 ${className}`} aria-label="Fase pertumbuhan padi">
      <p className="text-sm text-slate-800">
        <span className="font-semibold">Hari ke-{hst}</span> setelah tanam, fase{" "}
        <span className="font-semibold">{aktif?.nama.toLowerCase()}</span>
        {varietas && <> ({varietas})</>}
        {tanggalTanam && <>. Ditanam {formatTanggal(tanggalTanam)}.</>}
      </p>

      <div className="relative mt-6 pb-1" aria-hidden="true">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
          {FASE.map((f) => (
            <div
              key={f.kode}
              style={{ flexGrow: f.akhir - f.mulai, flexBasis: 0 }}
              className={f.kode === fase ? "bg-emerald-600" : "bg-emerald-100"}
            />
          ))}
        </div>
        <div
          className="absolute -top-5 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${Math.min(Math.max(posisi, 4), 96)}%` }}
        >
          <span className="rounded bg-slate-900 px-1.5 py-0.5 text-xs font-medium text-white">
            {hst} HST
          </span>
          <span className="h-5 w-px bg-slate-900" />
        </div>
      </div>

      <ol className="mt-3 grid gap-2 sm:grid-cols-3">
        {FASE.map((f) => (
          <li
            key={f.kode}
            aria-current={f.kode === fase ? "step" : undefined}
            className={`min-w-0 rounded-md border p-2 text-sm ${
              f.kode === fase
                ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                : "border-slate-200 text-slate-600"
            }`}
          >
            <span className="block font-medium">
              {f.nama}
              {f.kode === fase && " (sekarang)"}
            </span>
            <span className="block text-xs">{f.rentang}</span>
            <span className="block text-xs">{f.arti}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
