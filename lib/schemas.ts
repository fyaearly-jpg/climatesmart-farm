// lib/schemas.ts
//
// Skema domain ClimateSmart Farm, dibuat dari KONTRAK API v1.0 (8 Okt 2026).
// Zod tetap menjadi single source of truth: tipe TypeScript diturunkan lewat z.infer.
// Nama field memakai snake_case persis seperti kontrak, jadi tidak ada lapisan pemetaan.
//
// Dipakai oleh Server Components maupun Client Components.

import { z } from "zod";
// Harus tepat setelah impor zod dan sebelum skema mana pun dibuat (termasuk skema di
// schemas.legacy.ts yang diekspor ulang di bawah). Lihat penjelasan di lib/zod-config.ts.
import "./zod-config";

/* -------------------------------------------------------------------- */
/* Primitif bersama                                                     */
/* -------------------------------------------------------------------- */

/** Tanggal `YYYY-MM-DD`. */
export const TanggalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

/** Waktu ISO 8601 dengan offset zona (contoh `2026-11-03T05:00:00+07:00`). */
export const WaktuSchema = z.iso.datetime({ offset: true });

const idBrand = <B extends string>() => z.number().int().positive().brand<B>();

export const LahanIdSchema = idBrand<"LahanId">();
export const RekomendasiIdSchema = idBrand<"RekomendasiId">();
export const MusimTanamIdSchema = idBrand<"MusimTanamId">();
export const NotifikasiIdSchema = idBrand<"NotifikasiId">();
export type LahanId = z.infer<typeof LahanIdSchema>;
export type RekomendasiId = z.infer<typeof RekomendasiIdSchema>;
export type MusimTanamId = z.infer<typeof MusimTanamIdSchema>;
export type NotifikasiId = z.infer<typeof NotifikasiIdSchema>;

/* -------------------------------------------------------------------- */
/* Enum bersama (KONTRAK bagian 1)                                      */
/* -------------------------------------------------------------------- */

export const RoleEnum = z.enum(["petani", "penyuluh", "admin"]);
export type Role = z.infer<typeof RoleEnum>;

export const StatusAkunEnum = z.enum(["pending", "aktif", "ditolak", "nonaktif"]);
export type StatusAkun = z.infer<typeof StatusAkunEnum>;

export const TingkatEnum = z.enum(["rendah", "sedang", "tinggi"]);
export type Tingkat = z.infer<typeof TingkatEnum>;

export const StatusValidasiEnum = z.enum(["menunggu", "disetujui", "diubah", "ditolak"]);
export type StatusValidasi = z.infer<typeof StatusValidasiEnum>;

export const StatusKirimEnum = z.enum(["terkirim", "belum_terkirim"]);
export type StatusKirim = z.infer<typeof StatusKirimEnum>;

export const AktivitasEnum = z.enum(["tanam", "pemupukan", "penyemprotan", "panen"]);
export type Aktivitas = z.infer<typeof AktivitasEnum>;

export const FaseEnum = z.enum(["awal", "vegetatif", "generatif"]);
export type Fase = z.infer<typeof FaseEnum>;

/** Batas atas HST per fase. Nilai awal dari kontrak; sesuaikan per varietas. */
export const BATAS_HST = { awal: 14, vegetatif: 55 } as const;

export function faseDariHst(hst: number): Fase {
  if (hst <= BATAS_HST.awal) return "awal";
  if (hst <= BATAS_HST.vegetatif) return "vegetatif";
  return "generatif";
}

export const KodePenyakitEnum = z.enum(["blas", "kresek"]);
export const KodeHamaEnum = z.enum(["wereng_coklat"]);
export const KodeMusimanEnum = z.enum(["penggerek_batang", "tikus"]);
export type KodePenyakit = z.infer<typeof KodePenyakitEnum>;
export type KodeHama = z.infer<typeof KodeHamaEnum>;
export type KodeMusiman = z.infer<typeof KodeMusimanEnum>;

export const StatusJadwalEnum = z.enum(["direkomendasikan", "ditunda", "siaga"]);
export type StatusJadwal = z.infer<typeof StatusJadwalEnum>;

export const SaranLabelEnum = z.enum(["tervalidasi", "belum_divalidasi"]);
export type SaranLabel = z.infer<typeof SaranLabelEnum>;

export const TahapNotifikasiEnum = z.enum(["waspada", "saran", "info"]);
export type TahapNotifikasi = z.infer<typeof TahapNotifikasiEnum>;

export const PenilaianEnum = z.enum(["cocok", "hati_hati", "tunda"]);
export type Penilaian = z.infer<typeof PenilaianEnum>;

export const AksiKoreksiEnum = z.enum(["setujui", "ubah", "tolak"]);
export type AksiKoreksi = z.infer<typeof AksiKoreksiEnum>;

/* -------------------------------------------------------------------- */
/* Amplop respons (KONTRAK bagian 1 dan 2)                              */
/* -------------------------------------------------------------------- */

export const MetaSchema = z.object({
  page: z.number().int(),
  per_page: z.number().int(),
  total: z.number().int(),
});
export type Meta = z.infer<typeof MetaSchema>;

export const dataEnvelope = <T extends z.ZodType>(data: T) => z.object({ data });
export const pagedEnvelope = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), meta: MetaSchema });

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

/* -------------------------------------------------------------------- */
/* Autentikasi dan akun (KONTRAK bagian 3)                              */
/* -------------------------------------------------------------------- */

const noWhatsappSchema = z
  .string()
  .regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid (contoh 081234567890)");

export const LoginInputSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const UserRingkasSchema = z.object({
  id_user: z.number().int(),
  nama: z.string(),
  role: RoleEnum,
  status_akun: StatusAkunEnum,
});
export type UserRingkas = z.infer<typeof UserRingkasSchema>;

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number().int(),
  user: UserRingkasSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().int(),
});

export const UserSchema = UserRingkasSchema.extend({
  username: z.string(),
  email: z.string(),
  no_whatsapp: z.string(),
});
export type User = z.infer<typeof UserSchema>;

const passwordSchema = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter")
  .regex(/[0-9]/, "Kata sandi harus mengandung minimal 1 angka");

export const LokasiSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export type Lokasi = z.infer<typeof LokasiSchema>;

export const RegisterPenyuluhInputSchema = z.object({
  nama: z.string().min(3, "Nama minimal 3 karakter").max(60, "Nama maksimal 60 karakter"),
  username: z.string().min(3, "Username minimal 3 karakter"),
  email: z.email("Format email tidak valid"),
  password: passwordSchema,
  no_whatsapp: noWhatsappSchema,
});
export type RegisterPenyuluhInput = z.infer<typeof RegisterPenyuluhInputSchema>;

export const RegisterPetaniInputSchema = RegisterPenyuluhInputSchema.extend({
  lahan: z.object({
    nama_lahan: z.string().min(3, "Nama lahan minimal 3 karakter").max(60),
    lokasi: LokasiSchema,
  }),
});
export type RegisterPetaniInput = z.infer<typeof RegisterPetaniInputSchema>;

/* -------------------------------------------------------------------- */
/* Lahan dan cuaca (KONTRAK bagian 4)                                   */
/* -------------------------------------------------------------------- */

export const LahanSchema = z.object({
  id_lahan: LahanIdSchema,
  nama_lahan: z.string(),
  lokasi: LokasiSchema,
  komoditas: z.literal("padi"),
});
export type Lahan = z.infer<typeof LahanSchema>;

export const CuacaTerkiniSchema = z.object({
  suhu: z.number(),
  kelembapan_udara: z.number(),
  curah_hujan: z.number(),
  kecepatan_angin: z.number(),
  suhu_tanah: z.number(),
  kelembapan_tanah: z.number(),
});

export const PrakiraanHarianSchema = z.object({
  tanggal: TanggalSchema,
  suhu_min: z.number(),
  suhu_maks: z.number(),
  suhu_rata: z.number(),
  kelembapan_rata: z.number(),
  jam_rh_90: z.number(),
  curah_hujan_total: z.number(),
  kecepatan_angin_maks: z.number(),
});

export const CuacaSchema = z.object({
  diperbarui: WaktuSchema,
  terkini: CuacaTerkiniSchema,
  prakiraan_harian: z.array(PrakiraanHarianSchema),
});
export type Cuaca = z.infer<typeof CuacaSchema>;
export type PrakiraanHarian = z.infer<typeof PrakiraanHarianSchema>;

/* -------------------------------------------------------------------- */
/* Musim tanam (KONTRAK bagian 5)                                       */
/* -------------------------------------------------------------------- */

export const MusimTanamSchema = z.object({
  id_musim_tanam: MusimTanamIdSchema,
  id_lahan: LahanIdSchema,
  tanggal_tanam: TanggalSchema,
  varietas: z.string(),
  hst: z.number().int().min(0),
  fase: FaseEnum,
  aktif: z.boolean(),
});
export type MusimTanam = z.infer<typeof MusimTanamSchema>;

export const MusimTanamInputSchema = z.object({
  tanggal_tanam: TanggalSchema,
  varietas: z
    .string()
    .trim()
    .min(2, "Varietas minimal 2 karakter")
    .max(60, "Varietas maksimal 60 karakter"),
});
export type MusimTanamInput = z.infer<typeof MusimTanamInputSchema>;

/* -------------------------------------------------------------------- */
/* Prediksi dan jadwal (KONTRAK bagian 7)                               */
/* -------------------------------------------------------------------- */

/** NFR-08: alasan wajib ada pada semua prediksi, jadi daftar kosong dianggap melanggar kontrak. */
const AlasanSchema = z.array(z.string()).min(1, "Alasan prediksi wajib ada (NFR-08)");

export const FaseInfoSchema = z.object({
  tanggal_tanam: TanggalSchema,
  varietas: z.string(),
  hst: z.number().int().min(0),
  fase: FaseEnum,
});
export type FaseInfo = z.infer<typeof FaseInfoSchema>;

export const RisikoCuacaPrediksiSchema = z.object({
  tingkat: TingkatEnum,
  probabilitas: z.object({
    rendah: z.number(),
    sedang: z.number(),
    tinggi: z.number(),
  }),
  alasan: AlasanSchema,
});

export const JadwalItemSchema = z.object({
  id_rekomendasi: RekomendasiIdSchema,
  aktivitas: AktivitasEnum,
  status: StatusJadwalEnum,
  tanggal: TanggalSchema,
  alasan: AlasanSchema,
  status_validasi: StatusValidasiEnum,
});
export type JadwalItem = z.infer<typeof JadwalItemSchema>;

const PrediksiOptDasarSchema = z.object({
  id_rekomendasi: RekomendasiIdSchema,
  nama: z.string(),
  tingkat: TingkatEnum,
  skor: z.number().min(0).max(1),
  alasan: AlasanSchema,
  pesan_waspada: z.string(),
  saran: z.array(z.string()),
  saran_tersedia: z.boolean(),
  saran_label: SaranLabelEnum.nullable(),
  status_validasi: StatusValidasiEnum,
  catatan_penyuluh: z.string().nullable(),
  indikatif: z.literal(true),
});

export const PenyakitSchema = PrediksiOptDasarSchema.extend({ kode: KodePenyakitEnum });
export const HamaSchema = PrediksiOptDasarSchema.extend({ kode: KodeHamaEnum });
export type Penyakit = z.infer<typeof PenyakitSchema>;
export type Hama = z.infer<typeof HamaSchema>;
export type PrediksiOpt = Penyakit | Hama;

export const MusimanSchema = z.object({
  kode: KodeMusimanEnum,
  nama: z.string(),
  pesan: z.string(),
});
export type Musiman = z.infer<typeof MusimanSchema>;

export const PrediksiSchema = z.object({
  id_lahan: LahanIdSchema,
  diperbarui: WaktuSchema,
  // Kontrak hanya memberi contoh dengan musim tanam aktif. Dibuat nullable agar lahan
  // yang belum punya musim tanam tidak membuat seluruh dashboard gagal divalidasi.
  fase: FaseInfoSchema.nullable(),
  risiko_cuaca: RisikoCuacaPrediksiSchema,
  jadwal: z.array(JadwalItemSchema),
  penyakit: z.array(PenyakitSchema),
  hama: z.array(HamaSchema),
  musiman: z.array(MusimanSchema),
});
export type Prediksi = z.infer<typeof PrediksiSchema>;

/* -------------------------------------------------------------------- */
/* Simulasi waktu tanam (KONTRAK bagian 6)                              */
/* -------------------------------------------------------------------- */

export const SimulasiInputSchema = z.object({
  id_lahan: z.number().int().positive("Pilih lahan terlebih dahulu"),
  tanggal_tanam: TanggalSchema,
});
export type SimulasiInput = z.infer<typeof SimulasiInputSchema>;

const SimulasiOptDasarSchema = z.object({
  nama: z.string(),
  tingkat: TingkatEnum,
  skor: z.number().min(0).max(1),
  alasan: AlasanSchema,
  saran: z.array(z.string()),
});
export const SimulasiPenyakitSchema = SimulasiOptDasarSchema.extend({ kode: KodePenyakitEnum });
export const SimulasiHamaSchema = SimulasiOptDasarSchema.extend({ kode: KodeHamaEnum });
export type SimulasiOpt =
  | z.infer<typeof SimulasiPenyakitSchema>
  | z.infer<typeof SimulasiHamaSchema>;

export const SimulasiSchema = z.object({
  id_lahan: LahanIdSchema,
  tanggal_tanam: TanggalSchema,
  jendela: z.object({ mulai: TanggalSchema, selesai: TanggalSchema }),
  disimpan: z.boolean(),
  indikatif: z.literal(true),
  kesimpulan: z.object({ penilaian: PenilaianEnum, pesan: z.string() }),
  risiko_cuaca: z.object({ tingkat: TingkatEnum, alasan: AlasanSchema }),
  penyakit: z.array(SimulasiPenyakitSchema),
  hama: z.array(SimulasiHamaSchema),
  musiman: z.array(MusimanSchema),
});
export type Simulasi = z.infer<typeof SimulasiSchema>;

/* -------------------------------------------------------------------- */
/* Notifikasi (KONTRAK bagian 8)                                        */
/* -------------------------------------------------------------------- */

export const NotifikasiSchema = z.object({
  id_notifikasi: NotifikasiIdSchema,
  id_rekomendasi: RekomendasiIdSchema,
  tahap: TahapNotifikasiEnum,
  pesan: z.string(),
  tanggal: TanggalSchema,
  status_kirim: StatusKirimEnum,
  dibaca: z.boolean(),
});
export type Notifikasi = z.infer<typeof NotifikasiSchema>;

export const BacaNotifikasiSchema = z.object({
  id_notifikasi: NotifikasiIdSchema,
  dibaca: z.boolean(),
});

/* -------------------------------------------------------------------- */
/* Antrean validasi dan koreksi penyuluh (KONTRAK bagian 9)             */
/* -------------------------------------------------------------------- */

export const AntreanValidasiItemSchema = z.object({
  prioritas: z.number().int(),
  id_rekomendasi: RekomendasiIdSchema,
  lahan: z.object({
    id_lahan: LahanIdSchema,
    nama_lahan: z.string(),
    pemilik: z.string(),
  }),
  jenis: z.enum(["penyakit", "hama"]),
  kode: z.union([KodePenyakitEnum, KodeHamaEnum]),
  nama: z.string(),
  tingkat: TingkatEnum,
  skor: z.number().min(0).max(1),
  fase: FaseEnum,
  alasan: AlasanSchema,
  saran_diajukan: z.array(z.string()),
  mulai_menunggu: WaktuSchema,
  batas_validasi: WaktuSchema,
  sisa_menit: z.number().int(),
  mendesak: z.boolean(),
});
export type AntreanValidasiItem = z.infer<typeof AntreanValidasiItemSchema>;

/** Catatan maksimal 120 karakter (KONTRAK bagian 14, format log_aktivitas). */
const catatanSchema = z.string().trim().max(120, "Catatan maksimal 120 karakter").optional();

export const KoreksiInputSchema = z.discriminatedUnion("aksi", [
  z.object({ aksi: z.literal("setujui"), catatan: catatanSchema }),
  z.object({ aksi: z.literal("tolak"), catatan: catatanSchema }),
  z.object({
    aksi: z.literal("ubah"),
    tingkat: TingkatEnum,
    saran: z.array(z.string().trim().min(1)).min(1, "Saran baru wajib diisi untuk aksi ubah"),
    catatan: catatanSchema,
  }),
]);
export type KoreksiInput = z.infer<typeof KoreksiInputSchema>;

export const KoreksiHasilSchema = z.object({
  id_rekomendasi: RekomendasiIdSchema,
  status_validasi: StatusValidasiEnum,
  notifikasi_terkirim: z.boolean(),
});
export type KoreksiHasil = z.infer<typeof KoreksiHasilSchema>;

/* -------------------------------------------------------------------- */
/* Jembatan sementara untuk kode yang belum dimigrasi                   */
/* -------------------------------------------------------------------- */
// Hapus baris ini (dan lib/schemas.legacy.ts) setelah semua pemakai skema lama pindah.
export * from "./schemas.legacy";
