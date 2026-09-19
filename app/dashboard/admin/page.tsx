// app/dashboard/admin/page.tsx — Server Component murni, khusus role admin (middleware.ts)
import type { Metadata } from "next";
import { RoleBadge } from "@/components/ui/Badge";
import { getAllUsers } from "@/lib/data/users";

export const metadata: Metadata = { title: "Kelola Pengguna" };

export default async function AdminUsersPage() {
  const users = await getAllUsers();

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <h1 className="mb-1 text-xl font-bold text-stone-800 dark:text-white">Kelola Pengguna</h1>
      <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
        Hanya dapat diakses peran Admin (middleware.ts). Daftar ini read-only pada versi demo.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase text-stone-500 dark:border-white/10 dark:text-stone-400">
              <th className="py-2 pr-4">Nama</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Peran</th>
              <th className="py-2 pr-4">Terdaftar</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-stone-100 dark:border-white/5">
                <td className="py-3 pr-4 font-medium text-stone-800 dark:text-white">{u.name}</td>
                <td className="py-3 pr-4 text-stone-500 dark:text-stone-400">{u.email}</td>
                <td className="py-3 pr-4">
                  <RoleBadge role={u.role} />
                </td>
                <td className="py-3 pr-4 text-stone-500 dark:text-stone-400">
                  {new Date(u.createdAt).toLocaleDateString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
