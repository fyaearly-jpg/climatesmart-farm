// hooks/useWeatherQuery.ts
//
// Server State entitas #2 (Modul 7). Dipakai oleh LiveWeatherWidget, sebuah
// Client Component leaf yang menerima data cuaca awal dari Server
// Component (RSC, Modul 6 — render pertama cepat & zero-JS) lewat prop
// `initialData`, lalu mengambil alih polling refresh setiap 45 detik di
// sisi klien tanpa reload halaman.
"use client";

import { useQuery } from "@tanstack/react-query";
import type { WeatherSample } from "@/lib/schemas";

export const WEATHER_KEY = ["weather"] as const;

async function fetchWeather(): Promise<WeatherSample> {
  const res = await fetch("/api/weather");
  if (!res.ok) throw new Error("Gagal memuat data cuaca.");
  return res.json();
}

export function useWeatherQuery(initialData: WeatherSample) {
  return useQuery({
    queryKey: WEATHER_KEY,
    queryFn: fetchWeather,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 45,
    initialData,
  });
}
