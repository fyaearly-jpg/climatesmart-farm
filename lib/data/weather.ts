// lib/data/weather.ts — Server-only, dipakai RSC & Route Handler /api/weather
import "server-only";
import { randomInt } from "node:crypto";
import { type WeatherSample, WeatherSampleSchema } from "../schemas";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SAMPLES: WeatherSample[] = [
  { suhu: 28, kelembapanUdara: 74, kondisi: "Berawan", risiko: "SEDANG" },
  { suhu: 31, kelembapanUdara: 58, kondisi: "Cerah", risiko: "RENDAH" },
  { suhu: 26, kelembapanUdara: 89, kondisi: "Hujan Lebat", risiko: "TINGGI" },
];

export async function getWeather(): Promise<WeatherSample> {
  await wait(150);
  const sample = SAMPLES[randomInt(SAMPLES.length)];
  return WeatherSampleSchema.parse(sample);
}
