// lib/auth-cookies.ts
//
// Cookie token JWT dari Flask. Keduanya `httpOnly`: JavaScript di browser tidak bisa membacanya,
// jadi token tidak bisa dicuri lewat XSS. Hanya kode server (route handler, server action)
// yang menyentuhnya.
//
// `CookieJar` sengaja dibuat sebagai antarmuka kecil supaya cocok dengan `NextResponse.cookies`
// (route handler) maupun `cookies()` dari next/headers (server action).

export const COOKIE_ACCESS = "csf_at";
export const COOKIE_REFRESH = "csf_rt";

/**
 * KONTRAK tidak menyebut masa berlaku refresh token (access token: 1800 detik).
 * Samakan nilai ini dengan konfigurasi JWT refresh di backend Flask.
 */
export const REFRESH_MAX_AGE_DETIK = 7 * 24 * 60 * 60;

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
}

export interface CookieJar {
  set(name: string, value: string, options: CookieOptions): unknown;
  delete(name: string): unknown;
}

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

function opsi(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    // Di lokal (http://localhost) cookie Secure akan ditolak browser, jadi hanya di production.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function setAccessCookie(jar: CookieJar, accessToken: string, expiresIn: number): void {
  jar.set(COOKIE_ACCESS, accessToken, opsi(expiresIn));
}

export function setTokenCookies(jar: CookieJar, tokens: TokenSet): void {
  setAccessCookie(jar, tokens.access_token, tokens.expires_in);
  jar.set(COOKIE_REFRESH, tokens.refresh_token, opsi(REFRESH_MAX_AGE_DETIK));
}

export function clearTokenCookies(jar: CookieJar): void {
  jar.delete(COOKIE_ACCESS);
  jar.delete(COOKIE_REFRESH);
}
