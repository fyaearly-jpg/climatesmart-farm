"use client";

// components/PredictionCard.tsx
// Kartu risiko hama/penyakit. NFR-08: faktor cuaca pemicu bisa dibuka lewat "Lihat alasan".
// Menerima dua bentuk data dari kontrak:
//  - PrediksiOpt (GET /lahan/{id}/prediksi): punya pesan waspada dan aturan tampilan saran.
//  - SimulasiOpt (POST /simulasi/waktu-tanam): hanya punya daftar saran, tanpa alur validasi.

import { useId, useState } from "react";
import { RiskBadge } from "@/components/RiskBadge";
import type { PrediksiOpt, SaranLabel, SimulasiOpt } from "@/lib/schemas";

const LABEL_SARAN: Record<SaranLabel, string> = {
  tervalidasi: "Sudah divalidasi penyuluh",
  belum_divalidasi: "Belum divalidasi penyuluh",
};

function dariPrediksiLahan(item: PrediksiOpt | SimulasiOpt): item is PrediksiOpt {
  return "saran_tersedia" in item;
}

export interface PredictionCardProps {
  item: PrediksiOpt | SimulasiOpt;
  className?: string;
}

export function PredictionCard({ item, className = "" }: PredictionCardProps) {
  const [terbuka, setTerbuka] = useState(false);
  const panelId = useId();
  const prediksiLahan = dariPrediksiLahan(item);

  const sarans = prediksiLahan ? (item.saran_tersedia ? item.saran : []) : item.saran;
  const saranMenunggu = prediksiLahan && !item.saran_tersedia;

  return (
    <article className={`min-w-0 rounded-lg border border-slate-200 bg-white p-4 ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{item.nama}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <RiskBadge tingkat={item.tingkat} />
          <span
            className="rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-700"
            title="Perkiraan dari prakiraan cuaca, bukan kepastian"
          >
            Indikatif
          </span>
        </div>
      </header>

      {prediksiLahan && <p className="mt-2 text-sm text-slate-800">{item.pesan_waspada}</p>}

      {sarans.length > 0 && (
        <section className="mt-3" aria-label={`Saran untuk ${item.nama}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-medium text-slate-900">Saran</h4>
            {prediksiLahan && item.saran_label && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                {LABEL_SARAN[item.saran_label]}
              </span>
            )}
          </div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
            {sarans.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {prediksiLahan && item.catatan_penyuluh && (
            <p className="mt-2 border-l-2 border-slate-300 pl-3 text-sm text-slate-700">
              Catatan penyuluh: {item.catatan_penyuluh}
            </p>
          )}
        </section>
      )}

      {saranMenunggu && (
        <p className="mt-3 text-sm text-slate-600">
          Saran pengendalian menunggu validasi penyuluh (paling lama 24 jam).
        </p>
      )}

      <button
        type="button"
        className="mt-3 rounded text-sm font-medium text-emerald-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        aria-expanded={terbuka}
        aria-controls={panelId}
        onClick={() => setTerbuka((v) => !v)}
      >
        {terbuka ? "Sembunyikan alasan" : "Lihat alasan"}
      </button>

      <div id={panelId} hidden={!terbuka} className="mt-2">
        <h4 className="text-sm font-medium text-slate-900">Faktor pemicu</h4>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
          {item.alasan.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-600">
          Skor model {Math.round(item.skor * 100)}%. Ambang awal belum tervalidasi lapangan.
        </p>
      </div>
    </article>
  );
}
