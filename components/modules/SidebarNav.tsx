// components/modules/SidebarNav.tsx
//
// Client Component ("use client") — satu-satunya alasan: usePathname()
// untuk menyorot link aktif + Zustand isSidebarCollapsed (Client UI State,
// Modul 7). Daftar link dibatasi sesuai peran (Server Component induk
// yang menentukan `role` dari cookie httpOnly, diteruskan sebagai prop —
// Client Component ini TIDAK pernah membaca cookie sendiri).
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/schemas";
import { useUIStore } from "@/store/useUIStore";

const linksByRole: Record<Role, { href: string; label: string; icon: string }[]> = {
  petani: [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/dashboard/tambah-lahan", label: "Tambah Lahan", icon: "➕" },
  ],
  penyuluh: [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/dashboard/validasi", label: "Validasi Rekomendasi", icon: "✅" },
  ],
  admin: [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/dashboard/admin", label: "Kelola Pengguna", icon: "👥" },
  ],
};

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const isCollapsed = useUIStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const links = linksByRole[role];

  return (
    <aside
      className={`shrink-0 border-r border-stone-200/70 bg-white/60 backdrop-blur transition-all duration-200 dark:border-white/10 dark:bg-stone-900/60 ${
        isCollapsed ? "w-16" : "w-60"
      }`}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-expanded={!isCollapsed}
        className="m-3 flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-white/10"
      >
        {isCollapsed ? "»" : "«"}
      </button>
      <nav aria-label="Navigasi modul" className="flex flex-col gap-1 px-3">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-md shadow-brand-900/20"
                  : "text-stone-600 hover:bg-brand-50 dark:text-stone-300 dark:hover:bg-white/10"
              }`}
            >
              <span aria-hidden="true">{link.icon}</span>
              {!isCollapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
