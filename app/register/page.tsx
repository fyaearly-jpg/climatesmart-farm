// app/register/page.tsx — Server Component; form murni pakai Server Action
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { registerAction } from "@/lib/actions";

export const metadata: Metadata = { title: "Daftar ClimateSmart Farm" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden md:block">
        <Image
          src="https://images.pexels.com/photos/9293267/pexels-photo-9293267.jpeg?auto=compress&cs=tinysrgb&w=1200"
          alt="Petani merawat tanaman padi di sawah"
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-brand-900/20 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="text-2xl font-bold">Bergabung dengan ribuan Petani lainnya</p>
          <p className="mt-2 text-brand-100">
            Rekomendasi tani berbasis data, divalidasi Penyuluh resmi.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-gradient-to-b from-brand-50 to-white px-6 py-12 dark:from-stone-950 dark:to-stone-950">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            ← Kembali
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-brand-900 dark:text-white">Buat akun baru</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Gratis, dan hanya butuh waktu kurang dari satu menit.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </p>
          )}

          <form action={registerAction} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="name"
                className="text-sm font-medium text-stone-700 dark:text-stone-200"
              >
                Nama lengkap
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                minLength={3}
                className="h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                placeholder="Nama Anda"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-stone-700 dark:text-stone-200"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                placeholder="nama@email.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-stone-700 dark:text-stone-200"
              >
                Kata sandi
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                placeholder="Minimal 8 karakter, ada angka"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="role"
                className="text-sm font-medium text-stone-700 dark:text-stone-200"
              >
                Daftar sebagai
              </label>
              <select
                id="role"
                name="role"
                defaultValue="petani"
                className="h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
              >
                <option value="petani">Petani</option>
                <option value="penyuluh">Penyuluh</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              className="mt-2 h-11 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-semibold text-white shadow-lg shadow-brand-900/20 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
            >
              Daftar
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
