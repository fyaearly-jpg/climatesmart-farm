// components/modules/LiveWeatherWidget.tsx
//
// Client Component leaf yang menerima `initialData` hasil fetch Server
// Component (WeatherPanel, RSC) sebagai prop — paint pertama memakai HTML
// yang sudah jadi dari server (cepat, zero extra request), lalu
// useWeatherQuery (Modul 7) mengambil alih untuk polling refresh setiap
// 45 detik tanpa reload. Kombinasi RSC (Modul 6) + TanStack Query (Modul
// 7) dalam satu komponen.
"use client";

import { useWeatherQuery } from "@/hooks/useWeatherQuery";
import type { WeatherSample } from "@/lib/schemas";
import { ErrorBanner } from "../ui/AsyncUI";
import { RiskBadge } from "../ui/Badge";

export function LiveWeatherWidget({ initialData }: { initialData: WeatherSample }) {
  const weather = useWeatherQuery(initialData);

  if (weather.isError) {
    return (
      <ErrorBanner
        message={weather.error instanceof Error ? weather.error.message : "Gagal memuat cuaca."}
        onRetry={() => weather.refetch()}
      />
    );
  }

  return (
    <dl className="kv-list" aria-live="polite">
      <div>
        <dt>Suhu</dt>
        <dd>{weather.data.suhu}°C</dd>
      </div>
      <div>
        <dt>Kelembapan Udara</dt>
        <dd>{weather.data.kelembapanUdara}%</dd>
      </div>
      <div>
        <dt>Kondisi</dt>
        <dd>{weather.data.kondisi}</dd>
      </div>
      <div>
        <dt>Tingkat Risiko</dt>
        <dd>
          <RiskBadge risk={weather.data.risiko} />
        </dd>
      </div>
      {weather.isFetching && (
        <p className="muted" style={{ gridColumn: "1 / -1", fontSize: "0.75rem" }}>
          Memperbarui…
        </p>
      )}
    </dl>
  );
}
