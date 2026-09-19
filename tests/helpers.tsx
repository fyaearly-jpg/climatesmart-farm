// tests/helpers.tsx — utilitas bersama untuk test (bukan berkas test)
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import type { FarmRecommendation } from "@/lib/schemas";

export function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export function createWrapper(client: QueryClient = createClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

export function renderWithClient(ui: ReactElement, client: QueryClient = createClient()) {
  return { client, ...render(ui, { wrapper: createWrapper(client) }) };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const sampleRecommendations: FarmRecommendation[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    plotName: "Sawah Blok A",
    commodity: "Padi",
    activity: "TANAM",
    riskLevel: "SEDANG",
    scheduledDate: "2026-09-18",
    status: "MENUNGGU",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    plotName: "Kebun Blok C",
    commodity: "Cabai",
    activity: "SEMPROT",
    riskLevel: "TINGGI",
    scheduledDate: "2026-09-16",
    status: "MENUNGGU",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    plotName: "Sawah Blok B",
    commodity: "Padi",
    activity: "PUPUK",
    riskLevel: "RENDAH",
    scheduledDate: "2026-09-20",
    status: "TERVALIDASI",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
];
