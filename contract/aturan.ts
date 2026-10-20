// contract/aturan.ts
// Aturan logika dari KONTRAK yang tidak bisa dinyatakan oleh skema Zod saja.
// Setiap fungsi mengembalikan daftar pelanggaran (kosong berarti sesuai).

interface OptSaran {
  kode: string;
  saran_tersedia: boolean;
  saran_label: string | null;
  status_validasi: string;
}

/** KONTRAK bagian 7: aturan tampilan saran. */
export function periksaSaran(o: OptSaran): string[] {
  const m: string[] = [];
  const sudah = o.status_validasi === "disetujui" || o.status_validasi === "diubah";
  const awal = `${o.kode} (status_validasi=${o.status_validasi}, saran_tersedia=${o.saran_tersedia}, saran_label=${o.saran_label})`;
  if (sudah && !o.saran_tersedia) m.push(`${awal}: sudah divalidasi, saran_tersedia harus true`);
  if (sudah && o.saran_label !== "tervalidasi") m.push(`${awal}: sudah divalidasi, saran_label harus 'tervalidasi'`);
  if (o.status_validasi === "ditolak" && o.saran_tersedia) m.push(`${awal}: ditolak penyuluh, saran_tersedia harus false`);
  if (!o.saran_tersedia && o.saran_label !== null) m.push(`${awal}: saran belum tersedia, saran_label harus null`);
  if (o.saran_tersedia && o.status_validasi === "menunggu" && o.saran_label !== "belum_divalidasi") {
    m.push(`${awal}: batas 24 jam lewat tanpa validasi, saran_label harus 'belum_divalidasi'`);
  }
  return m;
}

interface ItemAntrean {
  prioritas: number;
  id_rekomendasi: number;
  tingkat: string;
  sisa_menit: number;
  mendesak: boolean;
  mulai_menunggu: string;
  batas_validasi: string;
}

const URUTAN_TINGKAT: Record<string, number> = { tinggi: 0, sedang: 1, rendah: 2 };
const JAM24_MS = 24 * 60 * 60 * 1000;

/** KONTRAK bagian 9: urutan prioritas, penanda mendesak, dan jendela validasi 24 jam. */
export function periksaAntrean(items: ItemAntrean[], sekarangMs: number): string[] {
  const m: string[] = [];
  items.forEach((it, i) => {
    const id = `rekomendasi ${it.id_rekomendasi}`;
    if (it.prioritas !== i + 1) m.push(`${id}: prioritas ${it.prioritas}, seharusnya ${i + 1} (urut 1..n tanpa lompat)`);
    const mendesak = it.tingkat === "tinggi" && it.sisa_menit < 360;
    if (it.mendesak !== mendesak) {
      m.push(`${id}: mendesak=${it.mendesak}, seharusnya ${mendesak} (tingkat tinggi dan sisa_menit < 360; tingkat=${it.tingkat}, sisa_menit=${it.sisa_menit})`);
    }
    const selisih = Date.parse(it.batas_validasi) - Date.parse(it.mulai_menunggu);
    if (Math.abs(selisih - JAM24_MS) > 60_000) m.push(`${id}: batas_validasi harus tepat 24 jam setelah mulai_menunggu`);
    const sisaHitung = (Date.parse(it.batas_validasi) - sekarangMs) / 60_000;
    if (Math.abs(sisaHitung - it.sisa_menit) > 5) {
      m.push(`${id}: sisa_menit=${it.sisa_menit} tidak cocok dengan batas_validasi (selisih dari sekarang sekitar ${Math.round(sisaHitung)} menit)`);
    }
    const sebelum = items[i - 1];
    if (sebelum) {
      const a = URUTAN_TINGKAT[sebelum.tingkat] ?? 9;
      const b = URUTAN_TINGKAT[it.tingkat] ?? 9;
      if (a > b) m.push(`${id}: tingkat ${it.tingkat} muncul setelah ${sebelum.tingkat}; tingkat tinggi harus lebih dulu`);
      if (a === b && sebelum.sisa_menit > it.sisa_menit) {
        m.push(`${id}: dalam tingkat yang sama, sisa_menit harus naik (${sebelum.sisa_menit} lalu ${it.sisa_menit})`);
      }
    }
  });
  return m;
}

interface HariCuaca {
  tanggal: string;
  suhu_min: number;
  suhu_rata: number;
  suhu_maks: number;
  kelembapan_rata: number;
  jam_rh_90: number;
  curah_hujan_total: number;
}

/** Pemeriksaan kewajaran data prakiraan: tanggal menaik dan nilai dalam rentang fisik. */
export function periksaPrakiraan(hari: HariCuaca[]): string[] {
  const m: string[] = [];
  hari.forEach((h, i) => {
    if (h.suhu_min > h.suhu_rata || h.suhu_rata > h.suhu_maks) m.push(`${h.tanggal}: harus suhu_min <= suhu_rata <= suhu_maks`);
    if (h.kelembapan_rata < 0 || h.kelembapan_rata > 100) m.push(`${h.tanggal}: kelembapan_rata di luar 0 sampai 100`);
    if (h.jam_rh_90 < 0 || h.jam_rh_90 > 24) m.push(`${h.tanggal}: jam_rh_90 di luar 0 sampai 24`);
    if (h.curah_hujan_total < 0) m.push(`${h.tanggal}: curah_hujan_total tidak boleh negatif`);
    const sebelum = hari[i - 1];
    if (sebelum && sebelum.tanggal >= h.tanggal) m.push(`${h.tanggal}: tanggal harus menaik tanpa duplikat (setelah ${sebelum.tanggal})`);
  });
  return m;
}

/** Nama field yang tidak boleh pernah muncul di respons pengguna. */
export function bocorRahasia(obj: Record<string, unknown>): string[] {
  return Object.keys(obj).filter((k) => /pass|hash|^pw$|secret|token/i.test(k));
}
