// app/providers.tsx
//
// Next.js App Router menjalankan Server Components per-request di server,
// sehingga QueryClient TIDAK boleh dibuat di module scope (akan dibagikan
// tak sengaja antar request/pengguna berbeda). Pola resmi TanStack Query
// untuk RSC: buat instance baru per-render lewat useState di dalam Client
// Component ini, lalu bungkus di app/layout.tsx.
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            gcTime: 1000 * 60 * 10,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
