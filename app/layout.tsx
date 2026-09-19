// app/layout.tsx — Root Layout (Server Component), Metadata API (Modul 6)
import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ClimateSmart Farm",
    template: "%s | ClimateSmart Farm",
  },
  description:
    "Platform rekomendasi tani berbasis AI, cuaca real-time, sensor IoT, dan validasi Penyuluh.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
