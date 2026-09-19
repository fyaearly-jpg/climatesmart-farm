// app/api/recommendations/[id]/validate/route.ts
//
// Route Handler PATCH — Modul 6. Dipanggil oleh
// useValidateRecommendationMutation (Modul 7) dari ValidationTableClient.
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateRecommendation } from "@/lib/data/recommendations";

const DecisionSchema = z.object({
  decision: z.enum(["TERVALIDASI", "DITOLAK"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const result = DecisionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ message: "Payload tidak valid" }, { status: 400 });
  }
  try {
    const updated = await validateRecommendation(id, result.data.decision);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Gagal memproses validasi." },
      { status: 404 },
    );
  }
}
