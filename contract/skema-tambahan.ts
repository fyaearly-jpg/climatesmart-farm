// contract/skema-tambahan.ts
// Skema untuk endpoint yang tidak dipakai aplikasi frontend, hanya oleh uji kontrak.

import { z } from "zod";
import { StatusAkunEnum, WaktuSchema } from "@/lib/schemas";

export const HealthSchema = z.object({
  app: z.string(),
  database: z.string(),
  model: z.string(),
  open_meteo_terakhir: z.union([WaktuSchema, z.null()]),
});

export const PersetujuanSchema = z.object({ id_user: z.number().int(), status_akun: StatusAkunEnum });

export const RegisterPenyuluhResponseSchema = z.object({
  id_user: z.number().int(),
  role: z.literal("penyuluh"),
  status_akun: z.literal("pending"),
});
