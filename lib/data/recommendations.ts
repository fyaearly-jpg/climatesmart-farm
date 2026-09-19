// lib/data/recommendations.ts
//
// Modul 6, Bagian C: "Server Components dapat mengakses database, sistem
// file, atau API internal secara langsung tanpa membuka endpoint HTTP
// publik." Berkas ini adalah lapisan akses data server-only tersebut —
// diimpor LANGSUNG oleh app/dashboard/page.tsx (Server Component, tanpa
// HTTP round-trip sama sekali) DAN dipakai ulang oleh Route Handler
// (app/api/recommendations/route.ts) yang melayani Client Component
// (TanStack Query, Modul 7) lewat HTTP biasa.
//
// BUG NYATA YANG DITEMUKAN & DIPERBAIKI (lihat laporan Bagian 4.3):
// Next.js/Turbopack meng-code-split setiap Route Handler ke chunk server
// terpisah. Modul ini sebelumnya menyimpan data di variabel `let store`
// pada module scope — cara ini DIAM-DIAM menghasilkan lebih dari satu
// salinan array (satu per chunk yang meng-impornya), sehingga
// PATCH /api/recommendations/[id]/validate memvalidasi salinan array yang
// BERBEDA dari yang dibaca GET /api/recommendations, memicu error
// "Rekomendasi tidak ditemukan." meski ID-nya benar. Diverifikasi nyata:
// `grep -rl "Rekomendasi tidak ditemukan" .next/server/chunks` menunjukkan
// 2 chunk terpisah memuat modul yang sama.
//
// Perbaikan: jangkar state ke `globalThis` (pola singleton yang sama
// dipakai untuk client Prisma di Next.js) — globalThis adalah SATU objek
// nyata per proses Node.js, tidak peduli berapa banyak salinan modul yang
// mengimpornya.
import "server-only";

import { randomUUID } from "node:crypto";
import { type FarmRecommendation, FarmRecommendationSchema } from "../schemas";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function seed(): FarmRecommendation[] {
  return [
    {
      id: randomUUID(),
      plotName: "Sawah Blok A",
      commodity: "Padi",
      activity: "TANAM",
      riskLevel: "SEDANG",
      scheduledDate: "2026-09-18",
      status: "MENUNGGU",
      createdAt: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      plotName: "Kebun Blok C",
      commodity: "Cabai",
      activity: "SEMPROT",
      riskLevel: "TINGGI",
      scheduledDate: "2026-09-16",
      status: "MENUNGGU",
      createdAt: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      plotName: "Sawah Blok B",
      commodity: "Padi",
      activity: "PUPUK",
      riskLevel: "RENDAH",
      scheduledDate: "2026-09-20",
      status: "TERVALIDASI",
      createdAt: new Date().toISOString(),
    },
  ];
}

const globalForStore = globalThis as unknown as { __csfRecommendations?: FarmRecommendation[] };
if (!globalForStore.__csfRecommendations) {
  globalForStore.__csfRecommendations = seed();
}

function getStore(): FarmRecommendation[] {
  return globalForStore.__csfRecommendations as FarmRecommendation[];
}
function setStore(next: FarmRecommendation[]): void {
  globalForStore.__csfRecommendations = next;
}

export async function getRecommendations(): Promise<FarmRecommendation[]> {
  await wait(150); // simulasi latensi query DB
  return getStore().map((r) => FarmRecommendationSchema.parse(r));
}

export async function createRecommendation(input: {
  plotName: string;
  commodity: string;
  activity: FarmRecommendation["activity"];
  scheduledDate: string;
}): Promise<FarmRecommendation> {
  await wait(200);
  const created = FarmRecommendationSchema.parse({
    id: randomUUID(),
    plotName: input.plotName,
    commodity: input.commodity,
    activity: input.activity,
    riskLevel: "SEDANG",
    scheduledDate: input.scheduledDate,
    status: "MENUNGGU",
    createdAt: new Date().toISOString(),
  });
  setStore([created, ...getStore()]);
  return created;
}

export async function validateRecommendation(
  id: string,
  decision: "TERVALIDASI" | "DITOLAK",
): Promise<FarmRecommendation> {
  await wait(200);
  const existing = getStore().find((r) => r.id === id);
  if (!existing) throw new Error("Rekomendasi tidak ditemukan.");
  const updated = { ...existing, status: decision };
  setStore(getStore().map((r) => (r.id === id ? updated : r)));
  return updated;
}
