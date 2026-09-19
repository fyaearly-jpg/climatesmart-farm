// lib/actions.ts
//
// Next.js Server Actions ("use server") — dipanggil langsung dari <form
// action={...}> pada Server Component (app/login, app/register), zero
// client JavaScript untuk alur autentikasi. Validasi Zod dijalankan di
// server sebelum menyentuh lib/data/users.ts.
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { registerUser, verifyLogin } from "./data/users";
import { LoginSchema, RegisterSchema } from "./schemas";

async function setSessionCookies(user: { role: string; name: string }) {
  const cookieStore = await cookies();
  cookieStore.set("csf_role", user.role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  cookieStore.set("csf_name", user.name, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function registerAction(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
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

  await setSessionCookies(created);
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

  await setSessionCookies(user);
  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("csf_role");
  cookieStore.delete("csf_name");
  redirect("/login");
}
