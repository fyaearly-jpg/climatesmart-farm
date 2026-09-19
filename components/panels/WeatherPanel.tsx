// components/panels/WeatherPanel.tsx
//
// Server Component async — memanggil lib/data/weather.ts LANGSUNG (tanpa
// HTTP round-trip, Modul 6 Bagian C). Dirender di dalam <Suspense> pada
// app/dashboard/page.tsx sehingga panel ini boleh lambat tanpa memblokir
// panel lain (Streaming SSR, Modul 6 Bagian E). Data awal diteruskan ke
// LiveWeatherWidget (Client leaf) yang mengambil alih polling refresh via
// TanStack Query (Modul 7).
import { getWeather } from "@/lib/data/weather";
import { LiveWeatherWidget } from "../modules/LiveWeatherWidget";

export async function WeatherPanel() {
  const data = await getWeather();
  return <LiveWeatherWidget initialData={data} />;
}
