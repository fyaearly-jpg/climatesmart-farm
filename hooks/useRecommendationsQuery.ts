// hooks/useRecommendationsQuery.ts
//
// Server State (Modul 7) — kini memanggil Route Handler ASLI (Modul 6:
// app/api/recommendations/route.ts) lewat fetch(), bukan simulasi
// setTimeout seperti Modul 5/7 versi Vite. queryFn melakukan fetch HTTP
// sungguhan ke server Next.js yang sama.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FarmRecommendation, PlotRegistrationInput } from "@/lib/schemas";

export const RECOMMENDATIONS_KEY = ["recommendations"] as const;

async function fetchRecommendations(): Promise<FarmRecommendation[]> {
  const res = await fetch("/api/recommendations");
  if (!res.ok) throw new Error("Gagal mengambil data rekomendasi dari server.");
  return res.json();
}

async function postRecommendation(input: PlotRegistrationInput): Promise<FarmRecommendation> {
  const res = await fetch("/api/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? "Gagal menyimpan data lahan.");
  }
  return res.json();
}

async function patchValidation(id: string, decision: "TERVALIDASI" | "DITOLAK") {
  const res = await fetch(`/api/recommendations/${id}/validate`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? "Gagal memproses validasi.");
  }
  return res.json();
}

/** initialData dari Server Component (RSC prefetch) — menghindari layar
 *  loading kosong sesaat Client Component ini mount; refetch berikutnya
 *  tetap lewat Route Handler seperti biasa. */
export function useRecommendationsQuery(initialData: FarmRecommendation[]) {
  return useQuery({
    queryKey: RECOMMENDATIONS_KEY,
    queryFn: fetchRecommendations,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    initialData,
  });
}

export function useCreateRecommendationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postRecommendation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECOMMENDATIONS_KEY });
    },
  });
}

export function useValidateRecommendationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "TERVALIDASI" | "DITOLAK" }) =>
      patchValidation(id, decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECOMMENDATIONS_KEY });
    },
  });
}
