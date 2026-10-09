// components/RiskBadge.tsx
// NFR-01: risiko ditampilkan dengan warna, ikon, DAN kata, tidak pernah warna saja.
// Setiap tingkat punya bentuk ikon berbeda (lingkaran, segitiga, segi delapan) supaya
// tetap terbedakan bagi pengguna buta warna.

import type { ReactNode } from "react";
import type { Tingkat } from "@/lib/schemas";

function Ikon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const GAYA: Record<Tingkat, { kata: string; penjelasan: string; kelas: string; ikon: ReactNode }> =
  {
    rendah: {
      kata: "Risiko rendah",
      penjelasan: "Aman, tetap pantau lahan",
      kelas: "border-emerald-300 bg-emerald-50 text-emerald-900",
      ikon: (
        <Ikon>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12.5 2.8 2.8L16 9.5" />
        </Ikon>
      ),
    },
    sedang: {
      kata: "Risiko sedang",
      penjelasan: "Perlu dipantau lebih sering",
      kelas: "border-amber-300 bg-amber-50 text-amber-900",
      ikon: (
        <Ikon>
          <path d="M12 4 21 20H3L12 4Z" />
          <path d="M12 10v4M12 17.2v.1" />
        </Ikon>
      ),
    },
    tinggi: {
      kata: "Risiko tinggi",
      penjelasan: "Segera periksa lahan Anda",
      kelas: "border-red-300 bg-red-50 text-red-900",
      ikon: (
        <Ikon>
          <path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7L8.5 3Z" />
          <path d="M12 8v5M12 16.2v.1" />
        </Ikon>
      ),
    },
  };

export interface RiskBadgeProps {
  tingkat: Tingkat;
  /** Tampilkan kalimat penjelasan di bawah label. */
  tampilkanPenjelasan?: boolean;
  className?: string;
}

export function RiskBadge({
  tingkat,
  tampilkanPenjelasan = false,
  className = "",
}: RiskBadgeProps) {
  const gaya = GAYA[tingkat];
  return (
    <span
      className={`inline-flex items-start gap-1.5 rounded-md border px-2 py-1 text-sm font-medium ${gaya.kelas} ${className}`}
    >
      <span className="mt-0.5">{gaya.ikon}</span>
      <span className="min-w-0">
        <span className="block leading-tight">{gaya.kata}</span>
        {tampilkanPenjelasan && (
          <span className="block text-xs font-normal leading-snug">{gaya.penjelasan}</span>
        )}
      </span>
    </span>
  );
}
