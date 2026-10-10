// lib/actions.ts
//
// Next.js Server Actions ("use server") — dipanggil langsung dari <form action={...}> pada
// Server Component (app/login, app/register), tanpa JavaScript klien untuk alur autentikasi.
//
// Alur sekarang memakai backend Flask (KONTRAK API v1.0):
//   login    -> POST /auth/login          -> token masuk cookie httpOnly + sesi bertanda-tangan
//   register -> POST /auth/register       -> lalu login otomatis (respons register tanpa token)
//   logout   -> hapus cookie token + sesi
// Token JWT tidak pernah dikirim ke browser sebagai data; hanya tersimpan di cookie httpOnly.
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clearTokenCookies, setTokenCookies } from "./auth-cookies";
import { loginBackend, pesanGalatPengguna, registerBackend } from "./backend";
import { LoginInputSchema, type LoginResponse, RegisterPetaniInputSchema } from "./schemas";
import { endSession, startSession } from "./session";

const keLogin = (pesan: string): never => redirect(`/login?error=${encodeURIComponent(pesan)}`);
const keRegister = (pesan: string): never =>
  redirect(`/register?error=${encodeURIComponent(pesan)}`);

const teks = (v: FormDataEntryValue | null): string => (typeof v === "string" ? v.trim() : "");
const mentah = (v: FormDataEntryValue | null): string => (typeof v === "string" ? v : "");

/** "-7,6298" dan "-7.6298" sama-sama diterima; kosong atau bukan angka -> NaN (ditolak Zod). */
const angka = (v: FormDataEntryValue | null): number => {
  const t = teks(v).replace(",", ".");
  return t === "" ? Number.NaN : Number(t);
};

async function simpanSesi(login: LoginResponse): Promise<void> {
  setTokenCookies(await cookies(), login);
  await startSession({ role: login.user.role, name: login.user.nama });
}

export async function loginAction(formData: FormData) {
  const input = LoginInputSchema.safeParse({
    username: teks(formData.get("username")),
    password: mentah(formData.get("password")),
  });
  if (!input.success) return keLogin("Username dan kata sandi wajib diisi.");

  const hasil = await loginBackend(input.data);
  if (!hasil.ok) return keLogin(pesanGalatPengguna(hasil));

  await simpanSesi(hasil.data);
  redirect("/dashboard");
}

export async function registerAction(formData: FormData) {
  // Pendaftaran publik SELALU menjadi Petani (endpoint /auth/register hanya untuk petani).
  const input = RegisterPetaniInputSchema.safeParse({
    nama: teks(formData.get("nama")),
    username: teks(formData.get("username")),
    email: teks(formData.get("email")),
    password: mentah(formData.get("password")),
    no_whatsapp: teks(formData.get("no_whatsapp")).replace(/[\s-]/g, ""),
    lahan: {
      nama_lahan: teks(formData.get("nama_lahan")),
      lokasi: { lat: angka(formData.get("lat")), lon: angka(formData.get("lon")) },
    },
  });
  if (!input.success) {
    return keRegister(input.error.issues[0]?.message ?? "Data pendaftaran tidak valid.");
  }

  const dibuat = await registerBackend(input.data);
  if (!dibuat.ok) return keRegister(pesanGalatPengguna(dibuat));

  // Respons register tidak berisi token, jadi masuk otomatis dengan kredensial yang sama.
  const masuk = await loginBackend({
    username: input.data.username,
    password: input.data.password,
  });
  if (!masuk.ok) {
    return keLogin(
      "Pendaftaran berhasil, tetapi masuk otomatis gagal. Silakan masuk secara manual.",
    );
  }

  await simpanSesi(masuk.data);
  redirect("/dashboard");
}

export async function logoutAction() {
  clearTokenCookies(await cookies());
  await endSession();
  redirect("/login");
}
