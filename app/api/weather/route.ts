// app/api/weather/route.ts — dipanggil oleh LiveWeatherWidget (Client, TanStack Query polling)
import { NextResponse } from "next/server";
import { getWeather } from "@/lib/data/weather";

export async function GET() {
  const data = await getWeather();
  return NextResponse.json(data);
}
