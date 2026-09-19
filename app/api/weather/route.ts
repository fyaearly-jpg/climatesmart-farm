// app/api/weather/route.ts — dipanggil oleh LiveWeatherWidget (Client, TanStack Query polling)
import { NextResponse } from "next/server";
import { authorize } from "@/lib/api-auth";
import { getWeather } from "@/lib/data/weather";

export async function GET() {
  const auth = await authorize();
  if (!auth.ok) return auth.response;

  const data = await getWeather();
  return NextResponse.json(data);
}
