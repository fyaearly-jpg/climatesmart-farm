// app/api/sensor/route.ts
import { NextResponse } from "next/server";
import { authorize } from "@/lib/api-auth";
import { getSensor } from "@/lib/data/sensor";

export async function GET() {
  const auth = await authorize();
  if (!auth.ok) return auth.response;

  const data = await getSensor();
  return NextResponse.json(data);
}
