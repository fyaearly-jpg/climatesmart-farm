// app/dashboard/layout.tsx
//
// Nested Layout (Modul 6) — Server Component yang membaca cookie sesi
// (httpOnly, tidak bisa diakses JS klien) untuk menentukan role & nama,
// lalu meneruskannya sebagai props ke SidebarNav (Client leaf). Layout
// ini TIDAK re-render saat berpindah antar /dashboard/* (App Router
// mempertahankan instance-nya), jadi sidebar/topbar tidak "berkedip"
// setiap kali pindah halaman.
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/modules/SidebarNav";
import { ThemeToggle } from "@/components/modules/ThemeToggle";
import { RoleBadge } from "@/components/ui/Badge";
import { logoutAction } from "@/lib/actions";
import { getSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Pagar kedua di level layout (middleware sudah menangani ini juga) —
  // pertahanan berlapis: jika suatu saat middleware dilewati/di-bypass,
  // Server Component ini tetap menolak render konten dashboard.
  if (!session) redirect("/login");
  const { role, name } = session;

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-brand-50/60 to-white dark:from-stone-950 dark:to-stone-950">
      <SidebarNav role={role} />
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-stone-200/70 bg-white/60 px-6 py-3 backdrop-blur dark:border-white/10 dark:bg-stone-900/60">
          <span className="font-bold text-brand-800 dark:text-brand-200">🌱 ClimateSmart Farm</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{name}</span>
              <RoleBadge role={role} />
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 dark:border-white/20 dark:text-stone-300 dark:hover:bg-white/10"
              >
                Keluar
              </button>
            </form>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
