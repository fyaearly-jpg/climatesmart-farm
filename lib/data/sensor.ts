// lib/data/sensor.ts — Server-only, dipakai RSC & Route Handler /api/sensor
import "server-only";
import { type SensorSample, SensorSampleSchema } from "../schemas";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SAMPLES: SensorSample[] = [
  { kelembapanTanah: 62, suhuTanah: 27, statusIrigasi: "Cukup" },
  { kelembapanTanah: 24, suhuTanah: 30, statusIrigasi: "Perlu Disiram" },
  { kelembapanTanah: 91, suhuTanah: 25, statusIrigasi: "Tergenang" },
];

export async function getSensor(): Promise<SensorSample> {
  await wait(150);
  const sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  return SensorSampleSchema.parse(sample);
}
