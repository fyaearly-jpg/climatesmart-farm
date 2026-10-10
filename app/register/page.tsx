// app/register/page.tsx - Server Component; form murni pakai Server Action
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { registerAction } from "@/lib/actions";

export const metadata: Metadata = { title: "Daftar ClimateSmart Farm" };

const kelasInput =
  "h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:text-white";

interface FieldProps {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder: string;
  minLength?: number;
  inputMode?: "text" | "decimal" | "tel" | "email";
  hint?: string;
}

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  minLength,
  inputMode,
  hint,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-stone-700 dark:text-stone-200">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        autoComplete={autoComplete}
        minLength={minLength}
        inputMode={inputMode}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={kelasInput}
        placeholder={placeholder}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-stone-500 dark:text-stone-400">
          {hint}
        </p>
      )}
    </div>
  );
}

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

      <main className="flex items-center justify-center bg-gradient-to-b from-brand-50 to-white px-6 py-12 dark:from-stone-950 dark:to-stone-950">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            ← Kembali
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-brand-900 dark:text-white">Buat akun baru</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Gratis, dan hanya butuh waktu kurang dari satu menit. Akun baru terdaftar sebagai
            Petani; akun Penyuluh dan Admin dibuat oleh pengelola platform.
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
            <Field
              id="nama"
              label="Nama lengkap"
              autoComplete="name"
              minLength={3}
              placeholder="Nama Anda"
            />
            <Field
              id="username"
              label="Username"
              autoComplete="username"
              minLength={3}
              placeholder="Contoh: pak_subur"
            />
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="nama@email.com"
            />
            <Field
              id="no_whatsapp"
              label="Nomor WhatsApp"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="081234567890"
              hint="Dipakai untuk menerima peringatan hama dan penyakit."
            />
            <Field
              id="password"
              label="Kata sandi"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="Minimal 8 karakter, ada angka"
            />

            <fieldset className="flex flex-col gap-4 rounded-xl border border-stone-200 p-4 dark:border-white/10">
              <legend className="px-1 text-sm font-semibold text-brand-800 dark:text-brand-200">
                Lahan pertama Anda
              </legend>
              <Field
                id="nama_lahan"
                label="Nama lahan"
                minLength={3}
                placeholder="Contoh: Sawah Utara"
              />
              <Field
                id="lat"
                label="Latitude"
                inputMode="decimal"
                placeholder="-7.6298"
                hint="Di Google Maps: klik kanan pada lokasi lahan, lalu salin angka pertama."
              />
              <Field
                id="lon"
                label="Longitude"
                inputMode="decimal"
                placeholder="111.5239"
                hint="Angka kedua dari koordinat yang sama."
              />
            </fieldset>

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
      </main>
    </div>
  );
}
