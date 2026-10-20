// contract/akun.ts
// Pembuat akun uji. Setiap uji membuat pengguna baru dengan nama unik, sehingga tidak bentrok dengan data yang ada.

import { LoginResponseSchema, RegisterResponseSchema, dataEnvelope } from "@/lib/schemas";
import { cocokkan, panggil } from "./client";

export interface Petani {
  idUser: number;
  idLahan: number;
  username: string;
  password: string;
  token: string;
  refresh: string;
}

export interface Kredensial {
  username: string;
  password: string;
}

const dibuat: number[] = [];
export const idPenggunaUji = (): number[] => [...dibuat];
export const catatPengguna = (id: number): void => {
  dibuat.push(id);
};

let urutan = 0;
export function namaUnik(awalan: string): string {
  urutan += 1;
  return `uji_${awalan}_${Date.now().toString(36)}${urutan}${Math.random().toString(36).slice(2, 5)}`.slice(0, 30);
}

export function nomorWa(): string {
  return `0812${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

export function bodyDaftar(awalan: string) {
  const id = namaUnik(awalan);
  return {
    nama: "Penguji Kontrak",
    username: id,
    email: `${id}@kontrak.test`,
    password: "Rahasia123",
    no_whatsapp: nomorWa(),
    lahan: { nama_lahan: "Lahan Uji Kontrak", lokasi: { lat: -7.6298, lon: 111.5239 } },
  };
}

export async function masuk(username: string, password: string) {
  const res = await panggil("POST", "/auth/login", { body: { username, password } });
  return cocokkan(dataEnvelope(LoginResponseSchema), res, "POST /auth/login").data;
}

export async function daftarPetani(awalan: string): Promise<Petani> {
  const body = bodyDaftar(awalan);
  const reg = await panggil("POST", "/auth/register", { body });
  const data = cocokkan(dataEnvelope(RegisterResponseSchema), reg, "POST /auth/register", 201).data;
  catatPengguna(data.id_user);
  if (data.id_lahan === undefined) {
    throw new Error("[KONTRAK] POST /auth/register: respons petani wajib memuat id_lahan");
  }
  const login = await masuk(body.username, body.password);
  return {
    idUser: data.id_user,
    idLahan: data.id_lahan,
    username: body.username,
    password: body.password,
    token: login.access_token,
    refresh: login.refresh_token,
  };
}
