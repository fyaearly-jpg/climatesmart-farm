// app/api/sensor/route.ts
import { NextResponse } from "next/server";
import { getSensor } from "@/lib/data/sensor";

export async function GET() {
  const data = await getSensor();
  return NextResponse.json(data);
}
