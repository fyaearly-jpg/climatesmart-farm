// lib/api-auth.ts
//
// Otorisasi untuk Route Handler. proxy.ts hanya menjaga /dashboard/*, jadi
// endpoint /api/* harus memeriksa sesi & peran sendiri — kalau tidak, siapa
// pun bisa memanggilnya langsung (curl/Postman) tanpa login.
import "server-only";
import { NextResponse } from "next/server";
import type { Role } from "./schemas";
import { getSession } from "./session";
import type { Session } from "./session-core";

type AuthResult = { ok: true; session: Session } | { ok: false; response: NextResponse };

/** Tanpa argumen = cukup sudah login. Dengan argumen = hanya peran yang disebut. */
export async function authorize(...allowedRoles: Role[]): Promise<AuthResult> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Belum login." }, { status: 401 }),
    };
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Peran Anda tidak diizinkan untuk aksi ini." },
        { status: 403 },
      ),
    };
  }
  return { ok: true, session };
}
