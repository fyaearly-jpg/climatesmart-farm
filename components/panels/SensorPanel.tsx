// components/panels/SensorPanel.tsx
//
// Server Component async murni — TIDAK ada Client Component turunan sama
// sekali (beda dengan WeatherPanel). Data dirender sekali per request dan
// tidak memperbarui diri sendiri tanpa reload/navigasi — sengaja dibuat
// begini untuk menunjukkan variasi: tidak semua panel butuh polling
// client-side, sebagian cukup RSC murni dengan bundle JS nol.
import { getSensor } from "@/lib/data/sensor";

export async function SensorPanel() {
  const data = await getSensor();
  return (
    <dl className="grid grid-cols-2 gap-4">
      <div>
        <dt className="text-xs text-stone-500 dark:text-stone-400">Kelembapan Tanah</dt>
        <dd className="text-lg font-bold text-stone-800 dark:text-white">
          {data.kelembapanTanah}%
        </dd>
      </div>
      <div>
        <dt className="text-xs text-stone-500 dark:text-stone-400">Suhu Tanah</dt>
        <dd className="text-lg font-bold text-stone-800 dark:text-white">{data.suhuTanah}°C</dd>
      </div>
      <div className="col-span-2">
        <dt className="text-xs text-stone-500 dark:text-stone-400">Status Irigasi</dt>
        <dd className="text-lg font-bold text-stone-800 dark:text-white">{data.statusIrigasi}</dd>
      </div>
    </dl>
  );
}
