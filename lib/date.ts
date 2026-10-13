// lib/date.ts
// Helper tanggal. Kontrak memakai zona Asia/Jakarta, jadi "hari ini" dihitung di zona itu,
// bukan di zona perangkat pengguna.

const ZONA = "Asia/Jakarta";

/** Simulasi hanya menerima 0 sampai 9 hari dari hari ini (KONTRAK bagian 6). */
export const RENTANG_SIMULASI_HARI = 9;

/** `YYYY-MM-DD` untuk hari ini di Asia/Jakarta. */
export function hariIniJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

export function tambahHari(tanggal: string, jumlah: number): string {
  const [y = 0, m = 1, d = 1] = tanggal.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + jumlah)).toISOString().slice(0, 10);
}

export function formatTanggal(tanggal: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${tanggal}T00:00:00Z`));
}

/** 312 -> "5 j 12 m"; 45 -> "45 m". Nilai nol atau negatif -> "0 m". */
export function formatSisaWaktu(menit: number): string {
  const total = Math.max(0, Math.floor(menit));
  const jam = Math.floor(total / 60);
  const sisa = total % 60;
  return jam > 0 ? `${jam} j ${sisa} m` : `${sisa} m`;
}

/** "2026-10-12" -> "Sen, 12 Okt". Dipakai untuk baris prakiraan harian. */
export function formatTanggalPendek(tanggal: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${tanggal}T00:00:00Z`));
}
