"use client";

// components/ValidationQueueCard.tsx
// Satu baris antrean validasi untuk penyuluh (FR-16).
// Hitung mundur dimulai dari `sisa_menit` dari server lalu dikurangi waktu yang sudah berlalu
// sejak data diterima (`diterimaPada`), sehingga tidak bergantung pada jam perangkat penyuluh.
// "Mendesak" mengikuti kontrak: tingkat tinggi DAN sisa waktu < 360 menit.

import { useEffect, useState } from "react";
import { RiskBadge } from "@/components/RiskBadge";
import { formatSisaWaktu } from "@/lib/date";
import type { AntreanValidasiItem } from "@/lib/schemas";

const BATAS_MENDESAK_MENIT = 360;
const JENDELA_MENIT = 24 * 60;

function hitungSisa(sisaMenit: number, diterimaPada: number): number {
  return sisaMenit - Math.floor((Date.now() - diterimaPada) / 60_000);
}

function useSisaMenit(sisaMenit: number, diterimaPada: number): number {
  const [sisa, setSisa] = useState(() => hitungSisa(sisaMenit, diterimaPada));
  useEffect(() => {
    const id = setInterval(() => setSisa(hitungSisa(sisaMenit, diterimaPada)), 30_000);
    return () => clearInterval(id);
  }, [sisaMenit, diterimaPada]);
  return sisa;
}

export interface ValidationQueueCardProps {
  item: AntreanValidasiItem;
  /** `dataUpdatedAt` dari useQuery: kapan antrean ini terakhir diterima. */
  diterimaPada: number;
  onTinjau: (item: AntreanValidasiItem) => void;
}

export function ValidationQueueCard({ item, diterimaPada, onTinjau }: ValidationQueueCardProps) {
  const sisa = useSisaMenit(item.sisa_menit, diterimaPada);
  const mendesak = item.tingkat === "tinggi" && sisa < BATAS_MENDESAK_MENIT;
  const lewat = sisa <= 0;
  const lebarBar = Math.min(Math.max(sisa / JENDELA_MENIT, 0), 1) * 100;

  return (
    <article
      className={`min-w-0 rounded-lg border bg-white p-4 ${
        mendesak ? "border-red-400" : "border-slate-200"
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-600">Prioritas {item.prioritas}</p>
          <h3 className="text-base font-semibold text-slate-900">
            {item.nama}
            <span className="font-normal text-slate-600"> pada fase {item.fase}</span>
          </h3>
          <p className="text-sm text-slate-700">
            {item.lahan.nama_lahan}, milik {item.lahan.pemilik}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mendesak && (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-700 px-2 py-1 text-sm font-semibold text-white">
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              Mendesak
            </span>
          )}
          <RiskBadge tingkat={item.tingkat} />
        </div>
      </header>

      <div className="mt-3">
        <p className="text-sm text-slate-800">
          {lewat ? (
            <span className="font-medium text-red-800">
              Batas 24 jam lewat. Saran terkirim ke petani berlabel belum divalidasi.
            </span>
          ) : (
            <>
              Sisa waktu <span className="font-semibold">{formatSisaWaktu(sisa)}</span> sebelum
              saran terkirim tanpa validasi
            </>
          )}
        </p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div
            className={`h-full ${mendesak ? "bg-red-600" : "bg-emerald-600"}`}
            style={{ width: `${lebarBar}%` }}
          />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <section>
          <h4 className="text-sm font-medium text-slate-900">
            Faktor pemicu (skor {Math.round(item.skor * 100)}%)
          </h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
            {item.alasan.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="text-sm font-medium text-slate-900">Saran yang diajukan sistem</h4>
          {item.saran_diajukan.length > 0 ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
              {item.saran_diajukan.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-600">Belum ada saran dari sistem.</p>
          )}
        </section>
      </div>

      <button
        type="button"
        onClick={() => onTinjau(item)}
        className="mt-4 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        Tinjau dan koreksi
      </button>
    </article>
  );
}
