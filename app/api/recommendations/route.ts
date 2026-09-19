// app/api/recommendations/route.ts
//
// Route Handler (Modul 6, Bagian G) — Web API standar berbasis Request/
// Response. Dipanggil oleh Client Component TanStack Query (Modul 7,
// useRecommendationsQuery/useCreateRecommendationMutation) lewat fetch()
// biasa. Memakai lib/data/recommendations.ts yang SAMA dengan yang
// dipanggil langsung oleh Server Component app/dashboard/page.tsx —
// satu sumber kebenaran data, dua jalur akses berbeda kebutuhan.
import { NextResponse } from "next/server";
import { createRecommendation, getRecommendations } from "@/lib/data/recommendations";
import { PlotRegistrationSchema } from "@/lib/schemas";

export async function GET() {
  const data = await getRecommendations();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = PlotRegistrationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { message: "Validasi gagal", issues: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const created = await createRecommendation(result.data);
  return NextResponse.json(created, { status: 201 });
}
