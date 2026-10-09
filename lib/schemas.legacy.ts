// lib/schemas.legacy.ts
//
// Skema LAMA (sebelum refactor ke KONTRAK API v1.0), dipertahankan sementara supaya kode
// yang belum dimigrasi tetap bisa dikompilasi. Diekspor ulang dari lib/schemas.ts.
// Hapus file ini (dan baris `export * from "./schemas.legacy"` di schemas.ts)
// setelah semua pemakainya pindah ke skema baru.

import { z } from "zod";
// Wajib dimuat sebelum skema di bawah dibuat (lihat lib/zod-config.ts).
import "./zod-config";

/** @deprecated Pakai `RekomendasiIdSchema` dari lib/schemas. */
type Brand<T, B extends string> = T & { readonly __brand: B };
/** @deprecated Pakai `RekomendasiId` dari lib/schemas. */
export type RecommendationId = Brand<string, "RecommendationId">;

/** @deprecated Pakai `AktivitasEnum` ("tanam" | "pemupukan" | "penyemprotan" | "panen"). */
export const ActivityTypeEnum = z.enum(["TANAM", "PUPUK", "SEMPROT", "PANEN"]);
export type ActivityType = z.infer<typeof ActivityTypeEnum>;

/** @deprecated Pakai `TingkatEnum` ("rendah" | "sedang" | "tinggi"). */
export const RiskLevelEnum = z.enum(["RENDAH", "SEDANG", "TINGGI"]);
export type RiskLevel = z.infer<typeof RiskLevelEnum>;

/** @deprecated Pakai `StatusValidasiEnum`. */
export const ValidationStatusEnum = z.enum(["MENUNGGU", "TERVALIDASI", "DITOLAK"]);
export type ValidationStatus = z.infer<typeof ValidationStatusEnum>;

export const PlotRegistrationSchema = z.object({
  plotName: z
    .string()
    .min(3, "Nama lahan minimal 3 karakter")
    .max(60, "Nama lahan maksimal 60 karakter"),
  commodity: z
    .string()
    .min(3, "Komoditas minimal 3 karakter")
    .max(40, "Komoditas maksimal 40 karakter"),
  areaHectare: z.coerce
    .number({ error: "Luas lahan wajib berupa angka" })
    .positive("Luas lahan harus lebih dari 0")
    .max(500, "Luas lahan maksimal 500 Ha"),
  activity: ActivityTypeEnum,
  scheduledDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "Format tanggal tidak valid (YYYY-MM-DD)",
  }),
});
export type PlotRegistrationInput = z.infer<typeof PlotRegistrationSchema>;

export const FarmRecommendationSchema = z.object({
  id: z.string().uuid(),
  plotName: z.string(),
  commodity: z.string(),
  activity: ActivityTypeEnum,
  riskLevel: RiskLevelEnum,
  scheduledDate: z.string(),
  status: ValidationStatusEnum.default("MENUNGGU"),
  createdAt: z.string().datetime(),
});
export type FarmRecommendation = z.infer<typeof FarmRecommendationSchema>;

export const WeatherSampleSchema = z.object({
  suhu: z.number(),
  kelembapanUdara: z.number(),
  kondisi: z.enum(["Cerah", "Berawan", "Hujan Ringan", "Hujan Lebat"]),
  risiko: RiskLevelEnum,
});
export type WeatherSample = z.infer<typeof WeatherSampleSchema>;

export const SensorSampleSchema = z.object({
  kelembapanTanah: z.number(),
  suhuTanah: z.number(),
  statusIrigasi: z.enum(["Cukup", "Perlu Disiram", "Tergenang"]),
});
export type SensorSample = z.infer<typeof SensorSampleSchema>;

/* Auth lama (login pakai email). `RoleEnum` dan `Role` TIDAK diekspor ulang di sini
   karena sudah dimiliki lib/schemas.ts dengan nilai yang sama. */
const RoleLama = z.enum(["petani", "penyuluh", "admin"]);

export const RegisterSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter").max(60, "Nama maksimal 60 karakter"),
  email: z.email("Format email tidak valid"),
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter")
    .regex(/[0-9]/, "Kata sandi harus mengandung minimal 1 angka"),
  role: RoleLama,
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});
/** Diberi akhiran "Lama" karena `LoginInput` kini milik lib/schemas.ts (login pakai username). */
export type LoginInputLama = z.infer<typeof LoginSchema>;

export const PublicUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.email(),
  role: RoleLama,
  createdAt: z.string().datetime(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;
