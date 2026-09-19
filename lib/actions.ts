// lib/actions.ts
//
// Next.js Server Actions ("use server") — dipanggil langsung dari <form
// action={...}> pada Server Component (app/login, app/register), zero
// client JavaScript untuk alur autentikasi. Validasi Zod dijalankan di
// server sebelum menyentuh lib/data/users.ts.
"use server";

import { redirect } from "next/navigation";
import { registerUser, verifyLogin } from "./data/users";
import { LoginSchema, RegisterSchema } from "./schemas";
import { endSession, startSession } from "./session";

export async function registerAction(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    // Pendaftaran publik SELALU menjadi Petani. Nilai "role" dari form diabaikan
    // supaya tidak ada yang bisa mendaftar sebagai Admin/Penyuluh lewat request manual.
    role: "petani",
  };
  const result = RegisterSchema.safeParse(raw);
  if (!result.success) {
    const firstIssue = result.error.issues[0]?.message ?? "Data pendaftaran tidak valid.";
    redirect(`/register?error=${encodeURIComponent(firstIssue)}`);
  }

  const created = await registerUser(result.data);
  if ("error" in created) {
    redirect(`/register?error=${encodeURIComponent(created.error)}`);
  }

  await startSession(created);
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const raw = { email: formData.get("email"), password: formData.get("password") };
  const result = LoginSchema.safeParse(raw);
  if (!result.success) {
    redirect(`/login?error=${encodeURIComponent("Email atau kata sandi tidak valid.")}`);
  }

  const user = await verifyLogin(result.data.email, result.data.password);
  if ("error" in user) {
    redirect(`/login?error=${encodeURIComponent(user.error)}`);
  }

  await startSession(user);
  redirect("/dashboard");
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}
