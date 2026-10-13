// lib/form.ts
// Pembantu formulir sisi klien.

const FORMAT_ANGKA = /^-?\d+(\.\d+)?$/;

/**
 * "-7,6298" dan "-7.6298" sama-sama diterima. Kosong, huruf, atau notasi ilmiah menghasilkan NaN,
 * yang ditolak oleh skema Zod dengan pesan yang jelas.
 */
export function parseAngka(teks: string): number {
  const t = teks.trim().replace(",", ".");
  return FORMAT_ANGKA.test(t) ? Number(t) : Number.NaN;
}

/** Format yang sama dengan Google Maps: titik desimal, lintang lalu bujur. */
export function formatKoordinat(lat: number, lon: number): string {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
