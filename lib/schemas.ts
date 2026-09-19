// lib/schemas.ts
//
// Domain schema ClimateSmart Farm — dipertahankan PERSIS sama dengan
// Modul 3-4/5/7 (Branded Types, Zod sebagai single source of truth,
// z.infer). Berkas ini dipakai baik oleh Server Components (RSC, lewat
// lib/data/*.ts) maupun Client Components (lewat hooks/*Query.ts), jadi
// satu skema menjamin type-safety end-to-end dari server sampai browser.

import { z } from "zod";

type Brand<T, B extends string> = T & { readonly __brand: B };
export type RecommendationId = Brand<string, "RecommendationId">;

export const ActivityTypeEnum = z.enum(["TANAM", "PUPUK", "SEMPROT", "PANEN"]);
export type ActivityType = z.infer<typeof ActivityTypeEnum>;

export const RiskLevelEnum = z.enum(["RENDAH", "SEDANG", "TINGGI"]);
export type RiskLevel = z.infer<typeof RiskLevelEnum>;

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

/* -------------------------------------------------------------------- */
/* Auth: Register & Login (3 peran)                                     */
/* -------------------------------------------------------------------- */
export const RoleEnum = z.enum(["petani", "penyuluh", "admin"]);
export type Role = z.infer<typeof RoleEnum>;

export const RegisterSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter").max(60, "Nama maksimal 60 karakter"),
  email: z.email("Format email tidak valid"),
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter")
    .regex(/[0-9]/, "Kata sandi harus mengandung minimal 1 angka"),
  role: RoleEnum,
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const PublicUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.email(),
  role: RoleEnum,
  createdAt: z.string().datetime(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;
