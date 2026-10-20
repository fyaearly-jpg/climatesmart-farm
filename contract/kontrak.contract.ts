// contract/kontrak.contract.ts
//
// UJI KONTRAK: memanggil backend (asli atau tiruan) dan memeriksa setiap respons terhadap KONTRAK API v1.0
// lewat skema Zod yang sama dengan yang dipakai frontend. Jalankan: npm run test:contract
// Target diambil dari CONTRACT_BASE_URL atau BACKEND_URL (.env.local). Lihat contract/README.md.

import { afterAll, beforeAll, describe, expect, it, type TestContext } from "vitest";
import { z } from "zod";
import { hariIniJakarta, tambahHari } from "@/lib/date";
import {
  AntreanValidasiItemSchema,
  BacaNotifikasiSchema,
  CuacaSchema,
  JadwalItemSchema,
  KoreksiHasilSchema,
  LahanSchema,
  LoginResponseSchema,
  MusimTanamSchema,
  NotifikasiSchema,
  PrediksiSchema,
  RefreshResponseSchema,
  RegisterResponseSchema,
  SimulasiSchema,
  UserSchema,
  dataEnvelope,
  pagedEnvelope,
} from "@/lib/schemas";
import { type Kredensial, type Petani, bodyDaftar, catatPengguna, daftarPetani, idPenggunaUji, masuk, namaUnik, nomorWa } from "./akun";
import { bocorRahasia, periksaAntrean, periksaPrakiraan, periksaSaran } from "./aturan";
import {
  type Respons,
  alamatDasar,
  cocokkan,
  harapkanGalat,
  harapkanGalatKlien,
  harapkanTanpaIsi,
  panggil,
  pastikanTargetAman,
} from "./client";
import { HealthSchema, PersetujuanSchema, RegisterPenyuluhResponseSchema } from "./skema-tambahan";

/* -------------------------------------------------------------------- */
/* Lingkungan dan fixture bersama                                       */
/* -------------------------------------------------------------------- */

interface Sesi {
  token: string;
  idUser: number;
}

const MOCK_ADMIN: Kredensial = { username: "admin", password: "admin12345" };
const MOCK_PENYULUH: Kredensial = { username: "siti_pp", password: "rahasia123" };

const lingkungan = {
  mock: false,
  admin: null as Kredensial | null,
  penyuluhEnv: null as Kredensial | null,
  koreksi: false,
};
let utama: Petani;
let lain: Petani;
let admin: Sesi | null = null;
let penyuluh: Sesi | null = null;

function kredensialEnv(awalan: "ADMIN" | "PENYULUH"): Kredensial | null {
  const username = process.env[`CONTRACT_${awalan}_USER`];
  const password = process.env[`CONTRACT_${awalan}_PASS`];
  return username && password ? { username, password } : null;
}

async function buatPenyuluhTerdaftar() {
  const id = namaUnik("pny");
  const body = { nama: "Penyuluh Uji Kontrak", username: id, email: `${id}@kontrak.test`, password: "Rahasia123", no_whatsapp: nomorWa() };
  const res = await panggil("POST", "/auth/register-penyuluh", { body });
  const data = cocokkan(dataEnvelope(RegisterPenyuluhResponseSchema), res, "POST /auth/register-penyuluh", 201).data;
  catatPengguna(data.id_user);
  return { ...body, idUser: data.id_user };
}

async function putuskan(adminToken: string, idUser: number, keputusan: "setujui" | "tolak", lahanIds: number[]) {
  const res = await panggil("PATCH", `/users/${idUser}/approve`, { token: adminToken, body: { keputusan, lahan_ids: lahanIds } });
  return cocokkan(dataEnvelope(PersetujuanSchema), res, `PATCH /users/${idUser}/approve (${keputusan})`).data;
}

beforeAll(async () => {
  pastikanTargetAman();
  // Persiapan hanya butuh membaca `database` secara longgar. Pemeriksaan ketat /health ada di tes tersendiri,
  // supaya kerusakan kecil di sana tidak menghentikan seluruh rangkaian uji.
  const sehat = await panggil("GET", "/health");
  if (sehat.status !== 200) {
    throw new Error(`[KONTRAK] GET /health: HTTP ${sehat.status}, backend belum siap di ${alamatDasar()}?\n  isi: ${sehat.teks.slice(0, 200)}`);
  }
  const longgar = dataEnvelope(z.object({ database: z.string().optional() })).safeParse(sehat.json);
  lingkungan.mock = longgar.success && longgar.data.data.database === "mock";
  lingkungan.admin = kredensialEnv("ADMIN") ?? (lingkungan.mock ? MOCK_ADMIN : null);
  lingkungan.penyuluhEnv = kredensialEnv("PENYULUH") ?? (lingkungan.mock ? MOCK_PENYULUH : null);
  lingkungan.koreksi = lingkungan.mock || process.env.CONTRACT_KOREKSI === "1";
  console.info(
    `\n[uji kontrak] target ${alamatDasar()} (${lingkungan.mock ? "server tiruan" : "backend"}) | ` +
      `admin: ${lingkungan.admin ? "ada" : "tidak ada"} | penyuluh: ${lingkungan.penyuluhEnv ? "dari kredensial" : lingkungan.admin ? "dibuat lewat admin" : "tidak ada"} | ` +
      `koreksi validasi: ${lingkungan.koreksi ? "aktif" : "nonaktif (CONTRACT_KOREKSI=1 untuk mengaktifkan)"}\n`,
  );

  utama = await daftarPetani("utama");
  lain = await daftarPetani("lain");

  if (lingkungan.admin) {
    const a = await masuk(lingkungan.admin.username, lingkungan.admin.password);
    admin = { token: a.access_token, idUser: a.user.id_user };
  }
  if (lingkungan.penyuluhEnv) {
    const p = await masuk(lingkungan.penyuluhEnv.username, lingkungan.penyuluhEnv.password);
    penyuluh = { token: p.access_token, idUser: p.user.id_user };
  } else if (admin) {
    const baru = await buatPenyuluhTerdaftar();
    await putuskan(admin.token, baru.idUser, "setujui", [utama.idLahan]);
    const p = await masuk(baru.username, baru.password);
    penyuluh = { token: p.access_token, idUser: p.user.id_user };
  }
}, 60_000);

afterAll(async () => {
  const ids = idPenggunaUji();
  if (!admin) {
    console.info(`\n[uji kontrak] ${ids.length} akun uji (awalan 'uji_') tertinggal: tidak ada kredensial admin untuk membersihkan.\n`);
    return;
  }
  let terhapus = 0;
  for (const id of ids) {
    if (id === admin.idUser) continue;
    const r = await panggil("DELETE", `/users/${id}`, { token: admin.token }).catch(() => null);
    if (r?.status === 204 || r?.status === 404) terhapus += 1; // 404: sudah dihapus oleh uji itu sendiri
  }
  console.info(`\n[uji kontrak] pembersihan: ${terhapus} dari ${ids.length} akun uji dihapus.\n`);
}, 60_000);

/* -------------------------------------------------------------------- */
/* Pembantu                                                             */
/* -------------------------------------------------------------------- */

const tanggalLalu = (hari: number) => tambahHari(hariIniJakarta(), -hari);
const tanggalNanti = (hari: number) => tambahHari(hariIniJakarta(), hari);
const adaIsi = (m: Record<string, unknown>, pesan: string) => expect(Object.keys(m).length, pesan).toBeGreaterThan(0);

async function buatMusim(p: Petani, hariLalu: number, varietas = "Inpari 32") {
  const res = await panggil("POST", `/lahan/${p.idLahan}/musim-tanam`, { token: p.token, body: { tanggal_tanam: tanggalLalu(hariLalu), varietas } });
  return cocokkan(dataEnvelope(MusimTanamSchema), res, `POST /lahan/${p.idLahan}/musim-tanam (${hariLalu} hari lalu)`, 201).data;
}

/** Endpoint yang bergantung pada cuaca boleh menjawab 503 DATA_CUACA_TIDAK_TERSEDIA; bentuk galatnya tetap diperiksa. */
function ambilAtauLewati<S extends z.ZodType>(res: Respons, schema: S, konteks: string, ctx: TestContext): z.infer<S> {
  if (res.status === 503) {
    harapkanGalat(res, 503, "DATA_CUACA_TIDAK_TERSEDIA", konteks);
    return ctx.skip(`${konteks}: DATA_CUACA_TIDAK_TERSEDIA (data cuaca belum ada). Bentuk galatnya sudah diperiksa, isi sukses belum.`);
  }
  return cocokkan(schema, res, konteks);
}

/* -------------------------------------------------------------------- */
/* 1. Konvensi umum (KONTRAK bagian 1 dan 2)                            */
/* -------------------------------------------------------------------- */

describe("Konvensi umum", () => {
  it("GET /health: 200 dan app ok", async () => {
    const d = cocokkan(dataEnvelope(HealthSchema), await panggil("GET", "/health"), "GET /health").data;
    expect(d.app).toBe("ok");
  });

  it("rute yang tidak ada: 404 TIDAK_DITEMUKAN dalam amplop JSON, bukan halaman HTML", async () => {
    harapkanGalat(await panggil("GET", "/rute-yang-tidak-ada"), 404, "TIDAK_DITEMUKAN", "GET /rute-yang-tidak-ada");
  });

  it("isi bukan JSON pada endpoint publik: 422 VALIDASI_GAGAL", async () => {
    const r = await panggil("POST", "/auth/login", { teksMentah: "{bukan json" });
    harapkanGalat(r, 422, "VALIDASI_GAGAL", "POST /auth/login (isi bukan JSON)");
  });

  it("endpoint terproteksi tanpa token: 401 TIDAK_TERAUTENTIKASI", async () => {
    harapkanGalat(await panggil("GET", "/auth/me"), 401, "TIDAK_TERAUTENTIKASI", "GET /auth/me (tanpa token)");
  });

  it("token tidak valid: 401 TIDAK_TERAUTENTIKASI (frontend mengandalkan ini untuk mengakhiri sesi)", async () => {
    // KONTRAK hanya menulis 'Token tidak ada'. Pustaka JWT sering menjawab 422 untuk token rusak; frontend hanya
    // mengakhiri sesi pada 401 TIDAK_TERAUTENTIKASI atau TOKEN_KEDALUWARSA, jadi ini disarankan ditambahkan ke KONTRAK.
    harapkanGalat(await panggil("GET", "/auth/me", { token: "bukan.token.valid" }), 401, "TIDAK_TERAUTENTIKASI", "GET /auth/me (token rusak)");
  });
});

/* -------------------------------------------------------------------- */
/* 2. Autentikasi dan akun (KONTRAK bagian 3)                           */
/* -------------------------------------------------------------------- */

describe("Autentikasi dan akun", () => {
  it("POST /auth/register: 201, petani langsung aktif, memuat id_lahan", async () => {
    const r = await panggil("POST", "/auth/register", { body: bodyDaftar("reg") });
    const d = cocokkan(dataEnvelope(RegisterResponseSchema), r, "POST /auth/register", 201).data;
    catatPengguna(d.id_user);
    expect(d).toMatchObject({ role: "petani", status_akun: "aktif" });
    expect(Number.isInteger(d.id_lahan), "id_lahan wajib ada pada respons register petani").toBe(true);
  });

  it("register dengan username atau email yang sudah dipakai: 409 DUPLIKAT", async () => {
    const body = bodyDaftar("dup");
    const pertama = await panggil("POST", "/auth/register", { body });
    catatPengguna(cocokkan(dataEnvelope(RegisterResponseSchema), pertama, "POST /auth/register", 201).data.id_user);
    harapkanGalat(await panggil("POST", "/auth/register", { body }), 409, "DUPLIKAT", "POST /auth/register (ulang)");
  });

  it("register dengan data tidak valid: 422 VALIDASI_GAGAL dan details memuat field yang salah", async () => {
    const body = { ...bodyDaftar("bad"), password: "pendek", email: "bukan-email", lahan: { nama_lahan: "ab", lokasi: { lat: 99, lon: 0 } } };
    const g = harapkanGalat(await panggil("POST", "/auth/register", { body }), 422, "VALIDASI_GAGAL", "POST /auth/register (tidak valid)");
    adaIsi(g.details, "details harus berisi field dan pesannya (KONTRAK bagian 2)");
  });

  it("POST /auth/login: 200, token, expires_in 1800 detik", async () => {
    const r = await panggil("POST", "/auth/login", { body: { username: utama.username, password: utama.password } });
    const d = cocokkan(dataEnvelope(LoginResponseSchema), r, "POST /auth/login").data;
    expect(d.expires_in).toBe(1800);
    expect(d.user).toMatchObject({ id_user: utama.idUser, role: "petani", status_akun: "aktif" });
  });

  it("login salah: 401 KREDENSIAL_SALAH, dan username tidak dikenal memberi kode yang sama", async () => {
    harapkanGalat(await panggil("POST", "/auth/login", { body: { username: utama.username, password: "salah-total" } }), 401, "KREDENSIAL_SALAH", "login (password salah)");
    harapkanGalat(await panggil("POST", "/auth/login", { body: { username: namaUnik("tidakada"), password: "apa-saja-1" } }), 401, "KREDENSIAL_SALAH", "login (username tidak dikenal)");
  });

  it("login tanpa username atau password: 422 VALIDASI_GAGAL", async () => {
    harapkanGalat(await panggil("POST", "/auth/login", { body: {} }), 422, "VALIDASI_GAGAL", "POST /auth/login (kosong)");
  });

  it("POST /auth/refresh: access token baru yang bisa dipakai; refresh token rusak: 401 TIDAK_TERAUTENTIKASI", async () => {
    const r = await panggil("POST", "/auth/refresh", { body: { refresh_token: utama.refresh } });
    const d = cocokkan(dataEnvelope(RefreshResponseSchema), r, "POST /auth/refresh").data;
    expect(d.expires_in).toBe(1800);
    cocokkan(dataEnvelope(UserSchema), await panggil("GET", "/auth/me", { token: d.access_token }), "GET /auth/me (token hasil refresh)");
    harapkanGalat(await panggil("POST", "/auth/refresh", { body: { refresh_token: "bukan.token.valid" } }), 401, "TIDAK_TERAUTENTIKASI", "POST /auth/refresh (rusak)");
  });

  it("GET /auth/me: profil sesuai dan tidak membocorkan kata sandi atau token", async () => {
    const d = cocokkan(dataEnvelope(UserSchema), await panggil("GET", "/auth/me", { token: utama.token }), "GET /auth/me").data;
    expect(d.username).toBe(utama.username);
    expect(bocorRahasia(d), "field berbahaya di respons").toEqual([]);
  });

  it("PATCH /auth/me: ubah profil dan kata sandi", async () => {
    const p = await daftarPetani("patch");
    const nama = await panggil("PATCH", "/auth/me", { token: p.token, body: { nama: "Nama Baru Uji" } });
    expect(cocokkan(dataEnvelope(UserSchema), nama, "PATCH /auth/me (nama)").data.nama).toBe("Nama Baru Uji");

    harapkanGalatKlien(await panggil("PATCH", "/auth/me", { token: p.token, body: { password_baru: "BaruRahasia1" } }), "PATCH /auth/me (tanpa password_lama)");
    harapkanGalatKlien(await panggil("PATCH", "/auth/me", { token: p.token, body: { password_lama: "salah-total", password_baru: "BaruRahasia1" } }), "PATCH /auth/me (password_lama salah)");
    await masuk(p.username, p.password); // kegagalan di atas tidak boleh mengubah kata sandi

    const ganti = await panggil("PATCH", "/auth/me", { token: p.token, body: { password_lama: p.password, password_baru: "BaruRahasia1" } });
    cocokkan(dataEnvelope(UserSchema), ganti, "PATCH /auth/me (ganti kata sandi)");
    await masuk(p.username, "BaruRahasia1");
    harapkanGalat(await panggil("POST", "/auth/login", { body: { username: p.username, password: p.password } }), 401, "KREDENSIAL_SALAH", "login (kata sandi lama)");
  });

  it("5 kali gagal login: 423 AKUN_TERKUNCI dengan details.sisa_menit", async () => {
    const p = await daftarPetani("kunci");
    for (let i = 0; i < 5; i += 1) {
      await panggil("POST", "/auth/login", { body: { username: p.username, password: "salah-total" } });
    }
    const r = await panggil("POST", "/auth/login", { body: { username: p.username, password: p.password } });
    const g = harapkanGalat(r, 423, "AKUN_TERKUNCI", "login setelah 5 kali gagal");
    expect(typeof g.details.sisa_menit, "details.sisa_menit harus angka").toBe("number");
    expect(Number(g.details.sisa_menit)).toBeGreaterThan(0);
  });

  it("POST /auth/register-penyuluh: 201 pending, login ditolak 403 AKUN_MENUNGGU", async () => {
    const p = await buatPenyuluhTerdaftar();
    const r = await panggil("POST", "/auth/login", { body: { username: p.username, password: p.password } });
    harapkanGalat(r, 403, "AKUN_MENUNGGU", "login penyuluh yang belum disetujui");
  });
});

/* -------------------------------------------------------------------- */
/* 3. Lahan (KONTRAK bagian 4)                                          */
/* -------------------------------------------------------------------- */

describe("Lahan", () => {
  const DaftarLahan = dataEnvelope(z.array(LahanSchema));
  let idBaru = 0;

  it("GET /lahan: hanya lahan milik sendiri, komoditas padi, lokasi sama dengan saat daftar", async () => {
    const milik = cocokkan(DaftarLahan, await panggil("GET", "/lahan", { token: utama.token }), "GET /lahan").data;
    const l = milik.find((x) => x.id_lahan === utama.idLahan);
    expect(l, "lahan dari register harus muncul di GET /lahan").toBeDefined();
    expect(l).toMatchObject({ nama_lahan: "Lahan Uji Kontrak", komoditas: "padi", lokasi: { lat: -7.6298, lon: 111.5239 } });

    const punyaLain = cocokkan(DaftarLahan, await panggil("GET", "/lahan", { token: lain.token }), "GET /lahan (petani lain)").data;
    expect(punyaLain.some((x) => x.id_lahan === utama.idLahan), "petani tidak boleh melihat lahan milik orang lain").toBe(false);
  });

  it("POST /lahan: 201 dan komoditas dikunci padi", async () => {
    const r = await panggil("POST", "/lahan", { token: utama.token, body: { nama_lahan: "Sawah Selatan", lokasi: { lat: -7.63, lon: 111.52 } } });
    const d = cocokkan(dataEnvelope(LahanSchema), r, "POST /lahan", 201).data;
    expect(d).toMatchObject({ nama_lahan: "Sawah Selatan", komoditas: "padi", lokasi: { lat: -7.63, lon: 111.52 } });
    idBaru = d.id_lahan;
  });

  it("POST /lahan dengan data tidak valid: 422 VALIDASI_GAGAL", async () => {
    const r = await panggil("POST", "/lahan", { token: utama.token, body: { nama_lahan: "ab", lokasi: { lat: 95, lon: 0 } } });
    adaIsi(harapkanGalat(r, 422, "VALIDASI_GAGAL", "POST /lahan (tidak valid)").details, "details harus memuat field yang salah");
  });

  it("PATCH /lahan/{id}: mengubah nama dan lokasi", async () => {
    const r = await panggil("PATCH", `/lahan/${idBaru}`, { token: utama.token, body: { nama_lahan: "Sawah Barat", lokasi: { lat: -7.64, lon: 111.53 } } });
    expect(cocokkan(dataEnvelope(LahanSchema), r, `PATCH /lahan/${idBaru}`).data).toMatchObject({ nama_lahan: "Sawah Barat", lokasi: { lat: -7.64, lon: 111.53 } });
    const daftar = cocokkan(DaftarLahan, await panggil("GET", "/lahan", { token: utama.token }), "GET /lahan").data;
    expect(daftar.find((x) => x.id_lahan === idBaru)?.nama_lahan).toBe("Sawah Barat");
  });

  it("PATCH /lahan/{id} tidak valid: 422 VALIDASI_GAGAL", async () => {
    harapkanGalat(await panggil("PATCH", `/lahan/${idBaru}`, { token: utama.token, body: { nama_lahan: "ab" } }), 422, "VALIDASI_GAGAL", "PATCH /lahan (nama pendek)");
  });

  it("petani lain tidak boleh membaca, mengubah, atau menghapus lahan: 403 AKSES_DITOLAK", async () => {
    const t = lain.token;
    harapkanGalat(await panggil("GET", `/lahan/${idBaru}/cuaca`, { token: t }), 403, "AKSES_DITOLAK", "GET /lahan/{id}/cuaca (bukan pemilik)");
    harapkanGalat(await panggil("PATCH", `/lahan/${idBaru}`, { token: t, body: { nama_lahan: "Curian" } }), 403, "AKSES_DITOLAK", "PATCH /lahan/{id} (bukan pemilik)");
    harapkanGalat(await panggil("DELETE", `/lahan/${idBaru}`, { token: t }), 403, "AKSES_DITOLAK", "DELETE /lahan/{id} (bukan pemilik)");
  });

  it("lahan yang tidak ada: 404 TIDAK_DITEMUKAN", async () => {
    harapkanGalat(await panggil("GET", "/lahan/999999999/cuaca", { token: utama.token }), 404, "TIDAK_DITEMUKAN", "GET /lahan/999999999/cuaca");
    harapkanGalat(await panggil("PATCH", "/lahan/999999999", { token: utama.token, body: { nama_lahan: "Tidak ada" } }), 404, "TIDAK_DITEMUKAN", "PATCH /lahan/999999999");
  });

  it("DELETE /lahan/{id}: 204 tanpa isi, lalu hilang dari daftar dan 404", async () => {
    harapkanTanpaIsi(await panggil("DELETE", `/lahan/${idBaru}`, { token: utama.token }), `DELETE /lahan/${idBaru}`);
    const daftar = cocokkan(DaftarLahan, await panggil("GET", "/lahan", { token: utama.token }), "GET /lahan").data;
    expect(daftar.some((x) => x.id_lahan === idBaru)).toBe(false);
    harapkanGalat(await panggil("GET", `/lahan/${idBaru}/cuaca`, { token: utama.token }), 404, "TIDAK_DITEMUKAN", "GET cuaca lahan yang sudah dihapus");
  });
});

/* -------------------------------------------------------------------- */
/* 4. Musim tanam (KONTRAK bagian 5)                                    */
/* -------------------------------------------------------------------- */

describe("Musim tanam", () => {
  let p: Petani;
  beforeAll(async () => {
    p = await daftarPetani("musim");
  });

  it("POST: 201, hst dan fase dihitung server dari tanggal tanam", async () => {
    const m = await buatMusim(p, 20, "Inpari 32");
    // Tanggal acuan Asia/Jakarta (KONTRAK bagian 1). Gagal di jam 00.00-07.00 WIB berarti server memakai UTC.
    expect(m).toMatchObject({ id_lahan: p.idLahan, varietas: "Inpari 32", tanggal_tanam: tanggalLalu(20), hst: 20, fase: "vegetatif", aktif: true });
  });

  it.each([
    [0, "awal"],
    [14, "awal"],
    [15, "vegetatif"],
    [55, "vegetatif"],
    [56, "generatif"],
  ])("batas fase: tanam %i hari lalu berfase %s (awal <= 14, vegetatif 15-55, generatif > 55)", async (hari, fase) => {
    const m = await buatMusim(p, hari);
    expect(m.hst, `tanam ${hari} hari lalu, hst harus ${hari}`).toBe(hari);
    expect(m.fase, `HST ${hari} harus berfase '${fase}' (awal <= 14, vegetatif 15-55, generatif > 55), tetapi server menjawab '${m.fase}'`).toBe(fase);
  });

  it("hanya satu musim aktif: yang terbaru, tampil pertama; sisanya riwayat", async () => {
    const terbaru = await buatMusim(p, 3, "Ciherang");
    const daftar = cocokkan(dataEnvelope(z.array(MusimTanamSchema)), await panggil("GET", `/lahan/${p.idLahan}/musim-tanam`, { token: p.token }), "GET musim-tanam").data;
    expect(daftar.filter((m) => m.aktif).map((m) => m.id_musim_tanam), "tepat satu musim aktif").toEqual([terbaru.id_musim_tanam]);
    expect(daftar[0]?.id_musim_tanam, "yang aktif harus pertama (KONTRAK bagian 5)").toBe(terbaru.id_musim_tanam);
    expect(daftar.length).toBeGreaterThanOrEqual(7);
  });

  it("PATCH /musim-tanam/{id}: mengubah tanggal dan varietas", async () => {
    const m = await buatMusim(p, 5);
    const r = await panggil("PATCH", `/musim-tanam/${m.id_musim_tanam}`, { token: p.token, body: { tanggal_tanam: tanggalLalu(10), varietas: "Mekongga" } });
    expect(cocokkan(dataEnvelope(MusimTanamSchema), r, "PATCH /musim-tanam/{id}").data).toMatchObject({ varietas: "Mekongga", tanggal_tanam: tanggalLalu(10), hst: 10 });
  });

  it("data tidak valid: 422 VALIDASI_GAGAL", async () => {
    const t = p.token;
    const url = `/lahan/${p.idLahan}/musim-tanam`;
    harapkanGalat(await panggil("POST", url, { token: t, body: { tanggal_tanam: tanggalLalu(1), varietas: "X" } }), 422, "VALIDASI_GAGAL", "POST musim-tanam (varietas 1 huruf)");
    harapkanGalat(await panggil("POST", url, { token: t, body: { tanggal_tanam: "03-11-2026", varietas: "Inpari 32" } }), 422, "VALIDASI_GAGAL", "POST musim-tanam (format tanggal salah)");
    harapkanGalat(await panggil("POST", url, { token: t, body: { varietas: "Inpari 32" } }), 422, "VALIDASI_GAGAL", "POST musim-tanam (tanpa tanggal)");
  });

  it("petani lain: 403 AKSES_DITOLAK untuk daftar, tambah, dan ubah", async () => {
    const m = await buatMusim(p, 2);
    const t = lain.token;
    harapkanGalat(await panggil("GET", `/lahan/${p.idLahan}/musim-tanam`, { token: t }), 403, "AKSES_DITOLAK", "GET musim-tanam (bukan pemilik)");
    harapkanGalat(await panggil("POST", `/lahan/${p.idLahan}/musim-tanam`, { token: t, body: { tanggal_tanam: tanggalLalu(1), varietas: "Curian" } }), 403, "AKSES_DITOLAK", "POST musim-tanam (bukan pemilik)");
    harapkanGalat(await panggil("PATCH", `/musim-tanam/${m.id_musim_tanam}`, { token: t, body: { varietas: "Curian" } }), 403, "AKSES_DITOLAK", "PATCH musim-tanam (bukan pemilik)");
  });
});

/* -------------------------------------------------------------------- */
/* 5. Cuaca, prediksi, jadwal (KONTRAK bagian 4 dan 7)                  */
/* -------------------------------------------------------------------- */

describe("Cuaca, prediksi, dan jadwal", () => {
  let p: Petani;
  beforeAll(async () => {
    p = await daftarPetani("prediksi");
    await buatMusim(p, 20, "Inpari 32");
  });

  it("GET /lahan/{id}/cuaca: sesuai skema, minimal 7 hari prakiraan, nilai wajar", async (ctx) => {
    const r = await panggil("GET", `/lahan/${p.idLahan}/cuaca`, { token: p.token });
    const d = ambilAtauLewati(r, dataEnvelope(CuacaSchema), "GET /lahan/{id}/cuaca", ctx).data;
    expect(d.prakiraan_harian.length, "frontend menampilkan prakiraan 7 hari").toBeGreaterThanOrEqual(7);
    expect(d.terkini.kelembapan_udara).toBeGreaterThanOrEqual(0);
    expect(d.terkini.kelembapan_udara).toBeLessThanOrEqual(100);
    const masalah = periksaPrakiraan(d.prakiraan_harian);
    expect(masalah, masalah.join("\n")).toEqual([]);
  });

  it("GET /lahan/{id}/prediksi: skema, fase dari musim aktif, probabilitas berjumlah 1, aturan saran", async (ctx) => {
    const r = await panggil("GET", `/lahan/${p.idLahan}/prediksi`, { token: p.token });
    const d = ambilAtauLewati(r, dataEnvelope(PrediksiSchema), "GET /lahan/{id}/prediksi", ctx).data;
    expect(d.id_lahan).toBe(p.idLahan);
    expect(d.fase, "fase wajib terisi bila ada musim tanam aktif").toMatchObject({ hst: 20, fase: "vegetatif", varietas: "Inpari 32" });
    const { rendah, sedang, tinggi } = d.risiko_cuaca.probabilitas;
    expect(Math.abs(rendah + sedang + tinggi - 1), "probabilitas harus berjumlah 1").toBeLessThan(0.02);
    const masalah = [...d.penyakit, ...d.hama].flatMap(periksaSaran);
    expect(masalah, masalah.join("\n")).toEqual([]);
  });

  it("GET /lahan/{id}/jadwal: daftar jadwal, filter aktivitas, dan aktivitas tidak dikenal ditolak", async () => {
    const semua = cocokkan(dataEnvelope(z.array(JadwalItemSchema)), await panggil("GET", `/lahan/${p.idLahan}/jadwal`, { token: p.token }), "GET jadwal").data;
    const pupuk = cocokkan(dataEnvelope(z.array(JadwalItemSchema)), await panggil("GET", `/lahan/${p.idLahan}/jadwal?aktivitas=pemupukan`, { token: p.token }), "GET jadwal?aktivitas=pemupukan").data;
    expect(pupuk.every((j) => j.aktivitas === "pemupukan"), "filter aktivitas harus menyaring").toBe(true);
    expect(pupuk.length).toBeLessThanOrEqual(semua.length);
    harapkanGalat(await panggil("GET", `/lahan/${p.idLahan}/jadwal?aktivitas=salah`, { token: p.token }), 422, "VALIDASI_GAGAL", "GET jadwal?aktivitas=salah");
  });

  it("petani lain: 403 AKSES_DITOLAK untuk prediksi dan jadwal", async () => {
    harapkanGalat(await panggil("GET", `/lahan/${p.idLahan}/prediksi`, { token: lain.token }), 403, "AKSES_DITOLAK", "GET prediksi (bukan pemilik)");
    harapkanGalat(await panggil("GET", `/lahan/${p.idLahan}/jadwal`, { token: lain.token }), 403, "AKSES_DITOLAK", "GET jadwal (bukan pemilik)");
  });
});

/* -------------------------------------------------------------------- */
/* 6. Simulasi waktu tanam (KONTRAK bagian 6)                           */
/* -------------------------------------------------------------------- */

describe("Simulasi waktu tanam", () => {
  let p: Petani;
  beforeAll(async () => {
    p = await daftarPetani("simulasi");
  });

  it.for([0, 4, 9])("tanggal %i hari dari hari ini: sesuai skema, jendela 7 hari, tidak disimpan, di bawah 5 detik", async (hari, ctx) => {
    const tanggal = tanggalNanti(hari);
    const r = await panggil("POST", "/simulasi/waktu-tanam", { token: p.token, body: { id_lahan: p.idLahan, tanggal_tanam: tanggal } });
    const d = ambilAtauLewati(r, dataEnvelope(SimulasiSchema), `POST /simulasi/waktu-tanam (+${hari} hari)`, ctx).data;
    expect(d).toMatchObject({ id_lahan: p.idLahan, tanggal_tanam: tanggal, disimpan: false, indikatif: true });
    expect(d.jendela).toEqual({ mulai: tanggal, selesai: tambahHari(tanggal, 6) });
    expect(r.ms, "NFR: simulasi harus selesai di bawah 5 detik").toBeLessThan(5000);
  });

  it("hasil simulasi tidak menambah musim tanam", async () => {
    const hitung = async () => cocokkan(dataEnvelope(z.array(MusimTanamSchema)), await panggil("GET", `/lahan/${p.idLahan}/musim-tanam`, { token: p.token }), "GET musim-tanam").data.length;
    const sebelum = await hitung();
    await panggil("POST", "/simulasi/waktu-tanam", { token: p.token, body: { id_lahan: p.idLahan, tanggal_tanam: tanggalNanti(2) } });
    expect(await hitung(), "simulasi tidak boleh menyimpan apa pun").toBe(sebelum);
  });

  it("di luar 0 sampai 9 hari: 422 TANGGAL_DI_LUAR_PRAKIRAAN", async () => {
    for (const tanggal of [tanggalLalu(1), tanggalNanti(10)]) {
      const r = await panggil("POST", "/simulasi/waktu-tanam", { token: p.token, body: { id_lahan: p.idLahan, tanggal_tanam: tanggal } });
      harapkanGalat(r, 422, "TANGGAL_DI_LUAR_PRAKIRAAN", `POST /simulasi/waktu-tanam (${tanggal})`);
    }
  });

  it("input salah: 422 VALIDASI_GAGAL, lahan orang lain 403, lahan tidak ada 404", async () => {
    const t = p.token;
    harapkanGalat(await panggil("POST", "/simulasi/waktu-tanam", { token: t, body: { id_lahan: p.idLahan, tanggal_tanam: "bukan-tanggal" } }), 422, "VALIDASI_GAGAL", "simulasi (format tanggal)");
    harapkanGalat(await panggil("POST", "/simulasi/waktu-tanam", { token: t, body: { tanggal_tanam: tanggalNanti(1) } }), 422, "VALIDASI_GAGAL", "simulasi (tanpa id_lahan)");
    harapkanGalat(await panggil("POST", "/simulasi/waktu-tanam", { token: lain.token, body: { id_lahan: p.idLahan, tanggal_tanam: tanggalNanti(1) } }), 403, "AKSES_DITOLAK", "simulasi (lahan orang lain)");
    harapkanGalat(await panggil("POST", "/simulasi/waktu-tanam", { token: t, body: { id_lahan: 999999999, tanggal_tanam: tanggalNanti(1) } }), 404, "TIDAK_DITEMUKAN", "simulasi (lahan tidak ada)");
  });
});

/* -------------------------------------------------------------------- */
/* 7. Notifikasi (KONTRAK bagian 8)                                     */
/* -------------------------------------------------------------------- */

describe("Notifikasi", () => {
  let p: Petani;
  beforeAll(async () => {
    p = await daftarPetani("notif");
  });

  const Daftar = pagedEnvelope(NotifikasiSchema);

  it("GET /notifikasi: bentuk paging, urutan id menurun, awalan pesan sesuai tahap", async () => {
    const d = cocokkan(Daftar, await panggil("GET", "/notifikasi", { token: p.token }), "GET /notifikasi");
    expect(d.meta).toMatchObject({ page: 1, per_page: 20 });
    expect(d.meta.total).toBeGreaterThanOrEqual(d.data.length);
    const ids = d.data.map((n) => n.id_notifikasi);
    expect(ids, "urutan id_notifikasi harus menurun").toEqual([...ids].sort((a, b) => b - a));
    for (const n of d.data) {
      if (n.tahap === "waspada") expect(n.pesan.startsWith("WASPADA:"), `notifikasi ${n.id_notifikasi}: tahap waspada harus berawalan 'WASPADA:'`).toBe(true);
      if (n.tahap === "saran") expect(n.pesan.startsWith("SARAN:"), `notifikasi ${n.id_notifikasi}: tahap saran harus berawalan 'SARAN:'`).toBe(true);
    }
  });

  it("parameter per_page dan dibaca=false dihormati", async () => {
    const satu = cocokkan(Daftar, await panggil("GET", "/notifikasi?per_page=1&page=1", { token: p.token }), "GET /notifikasi?per_page=1");
    expect(satu.data.length).toBeLessThanOrEqual(1);
    expect(satu.meta.per_page).toBe(1);
    const belum = cocokkan(Daftar, await panggil("GET", "/notifikasi?dibaca=false", { token: p.token }), "GET /notifikasi?dibaca=false");
    expect(belum.data.every((n) => n.dibaca === false), "filter dibaca=false harus menyaring").toBe(true);
  });

  it("PATCH /notifikasi/{id}/baca: menandai dibaca; bukan pemilik 403; tidak ada 404", async (ctx) => {
    const belum = cocokkan(Daftar, await panggil("GET", "/notifikasi?dibaca=false", { token: p.token }), "GET /notifikasi?dibaca=false").data;
    const n = belum[0];
    if (!n) return ctx.skip("Belum ada notifikasi untuk akun uji (backend asli membuatnya saat generate rekomendasi).");
    harapkanGalat(await panggil("PATCH", `/notifikasi/${n.id_notifikasi}/baca`, { token: lain.token }), 403, "AKSES_DITOLAK", "PATCH baca (bukan pemilik)");
    const r = await panggil("PATCH", `/notifikasi/${n.id_notifikasi}/baca`, { token: p.token });
    expect(cocokkan(dataEnvelope(BacaNotifikasiSchema), r, "PATCH /notifikasi/{id}/baca").data).toEqual({ id_notifikasi: n.id_notifikasi, dibaca: true });
    const sisa = cocokkan(Daftar, await panggil("GET", "/notifikasi?dibaca=false", { token: p.token }), "GET /notifikasi?dibaca=false").data;
    expect(sisa.some((x) => x.id_notifikasi === n.id_notifikasi), "notifikasi yang sudah dibaca tidak boleh muncul di dibaca=false").toBe(false);
    harapkanGalat(await panggil("PATCH", "/notifikasi/999999999/baca", { token: p.token }), 404, "TIDAK_DITEMUKAN", "PATCH baca (tidak ada)");
  });
});

/* -------------------------------------------------------------------- */
/* 8. Antrean validasi dan koreksi penyuluh (KONTRAK bagian 9)          */
/* -------------------------------------------------------------------- */

describe("Penyuluh: antrean validasi dan koreksi", () => {
  const Antrean = dataEnvelope(z.array(AntreanValidasiItemSchema));
  const ambilAntrean = async (token: string) => cocokkan(Antrean, await panggil("GET", "/rekomendasi/antrean-validasi", { token }), "GET /rekomendasi/antrean-validasi").data;

  it("GET antrean: skema, urutan prioritas, penanda mendesak, jendela 24 jam", async (ctx) => {
    if (!penyuluh) return ctx.skip("Tidak ada akun penyuluh (isi CONTRACT_PENYULUH_USER/PASS atau kredensial admin).");
    const items = await ambilAntrean(penyuluh.token);
    const masalah = periksaAntrean(items, Date.now());
    expect(masalah, masalah.join("\n")).toEqual([]);
  });

  it("koreksi dengan data tidak valid: 422 VALIDASI_GAGAL", async (ctx) => {
    if (!penyuluh) return ctx.skip("Tidak ada akun penyuluh.");
    const target = (await ambilAntrean(penyuluh.token))[0];
    if (!target) return ctx.skip("Antrean kosong: tidak ada rekomendasi untuk diuji.");
    const url = `/rekomendasi/${target.id_rekomendasi}/koreksi`;
    const t = penyuluh.token;
    harapkanGalat(await panggil("PATCH", url, { token: t, body: { aksi: "tidak-dikenal" } }), 422, "VALIDASI_GAGAL", "koreksi (aksi tidak dikenal)");
    harapkanGalat(await panggil("PATCH", url, { token: t, body: { aksi: "ubah" } }), 422, "VALIDASI_GAGAL", "koreksi ubah tanpa tingkat dan saran");
    harapkanGalat(await panggil("PATCH", url, { token: t, body: { aksi: "setujui", catatan: "x".repeat(121) } }), 422, "VALIDASI_GAGAL", "koreksi (catatan 121 karakter)");
    harapkanGalat(await panggil("PATCH", "/rekomendasi/999999999/koreksi", { token: t, body: { aksi: "setujui" } }), 404, "TIDAK_DITEMUKAN", "koreksi (id tidak ada)");
  });

  it("koreksi 'ubah': status diubah, saran terkirim ke petani (tanda | dalam catatan diganti), prediksi ikut berubah", async (ctx) => {
    if (!penyuluh) return ctx.skip("Tidak ada akun penyuluh.");
    if (!lingkungan.koreksi) return ctx.skip("Koreksi mengubah data rekomendasi; aktifkan dengan CONTRACT_KOREKSI=1.");
    const target = (await ambilAntrean(penyuluh.token)).find((i) => i.lahan.id_lahan === utama.idLahan);
    if (!target) return ctx.skip("Tidak ada item antrean untuk lahan uji (rekomendasi dibuat saat generate; penyuluh harus binaan lahan uji).");

    const r = await panggil("PATCH", `/rekomendasi/${target.id_rekomendasi}/koreksi`, {
      token: penyuluh.token,
      body: { aksi: "ubah", tingkat: "sedang", saran: ["Pantau 3 hari"], catatan: "Cek | blok B" },
    });
    expect(cocokkan(dataEnvelope(KoreksiHasilSchema), r, "PATCH koreksi (ubah)").data).toEqual({
      id_rekomendasi: target.id_rekomendasi,
      status_validasi: "diubah",
      notifikasi_terkirim: true,
    });

    const notif = cocokkan(pagedEnvelope(NotifikasiSchema), await panggil("GET", "/notifikasi", { token: utama.token }), "GET /notifikasi");
    const saran = notif.data.find((n) => n.id_rekomendasi === target.id_rekomendasi && n.tahap === "saran");
    expect(saran, "petani harus menerima notifikasi tahap saran").toBeDefined();
    expect(saran?.pesan.startsWith("SARAN:")).toBe(true);
    expect(saran?.pesan, "tanda | dilarang di catatan (KONTRAK bagian 14)").not.toContain("|");
    expect(saran?.pesan).toContain("blok B");

    const prediksi = cocokkan(dataEnvelope(PrediksiSchema), await panggil("GET", `/lahan/${utama.idLahan}/prediksi`, { token: utama.token }), "GET prediksi").data;
    const item = [...prediksi.penyakit, ...prediksi.hama].find((o) => o.id_rekomendasi === target.id_rekomendasi);
    expect(item).toMatchObject({ status_validasi: "diubah", tingkat: "sedang", saran: ["Pantau 3 hari"], saran_tersedia: true, saran_label: "tervalidasi" });
    expect(item?.catatan_penyuluh).toContain("blok B");
  });

  it("koreksi 'tolak': tidak mengirim saran ke petani", async (ctx) => {
    if (!penyuluh) return ctx.skip("Tidak ada akun penyuluh.");
    if (!lingkungan.koreksi) return ctx.skip("Aktifkan dengan CONTRACT_KOREKSI=1.");
    const target = (await ambilAntrean(penyuluh.token)).find((i) => i.lahan.id_lahan === utama.idLahan);
    if (!target) return ctx.skip("Tidak ada item antrean sisa untuk lahan uji.");
    const r = await panggil("PATCH", `/rekomendasi/${target.id_rekomendasi}/koreksi`, { token: penyuluh.token, body: { aksi: "tolak" } });
    expect(cocokkan(dataEnvelope(KoreksiHasilSchema), r, "PATCH koreksi (tolak)").data).toMatchObject({ status_validasi: "ditolak", notifikasi_terkirim: false });
    const notif = cocokkan(pagedEnvelope(NotifikasiSchema), await panggil("GET", "/notifikasi", { token: utama.token }), "GET /notifikasi");
    expect(notif.data.some((n) => n.id_rekomendasi === target.id_rekomendasi && n.tahap === "saran"), "penolakan tidak boleh mengirim saran").toBe(false);
  });
});

/* -------------------------------------------------------------------- */
/* 9. Admin (KONTRAK bagian 12)                                         */
/* -------------------------------------------------------------------- */

describe("Admin", () => {
  const Daftar = pagedEnvelope(UserSchema);

  it("GET /users: bentuk paging, filter, dan tidak membocorkan rahasia", async (ctx) => {
    if (!admin) return ctx.skip("Tidak ada kredensial admin (CONTRACT_ADMIN_USER/PASS).");
    const d = cocokkan(Daftar, await panggil("GET", "/users", { token: admin.token }), "GET /users");
    expect(d.meta.total).toBeGreaterThanOrEqual(d.data.length);
    for (const u of d.data) expect(bocorRahasia(u), `pengguna ${u.id_user} membocorkan field berbahaya`).toEqual([]);
    const f = cocokkan(Daftar, await panggil("GET", "/users?role=penyuluh&status_akun=pending", { token: admin.token }), "GET /users?role=penyuluh&status_akun=pending");
    expect(f.data.every((u) => u.role === "penyuluh" && u.status_akun === "pending"), "filter role dan status_akun harus menyaring").toBe(true);
  });

  it("persetujuan penyuluh: setujui -> bisa login; tolak -> AKUN_NONAKTIF; keputusan salah -> 422", async (ctx) => {
    if (!admin) return ctx.skip("Tidak ada kredensial admin.");
    const a = await buatPenyuluhTerdaftar();
    const b = await buatPenyuluhTerdaftar();
    harapkanGalat(await panggil("PATCH", `/users/${a.idUser}/approve`, { token: admin.token, body: { keputusan: "mungkin" } }), 422, "VALIDASI_GAGAL", "approve (keputusan salah)");

    expect(await putuskan(admin.token, a.idUser, "setujui", [utama.idLahan])).toEqual({ id_user: a.idUser, status_akun: "aktif" });
    cocokkan(dataEnvelope(LoginResponseSchema), await panggil("POST", "/auth/login", { body: { username: a.username, password: a.password } }), "login penyuluh yang disetujui");

    expect((await putuskan(admin.token, b.idUser, "tolak", [])).status_akun).toBe("ditolak");
    harapkanGalat(await panggil("POST", "/auth/login", { body: { username: b.username, password: b.password } }), 403, "AKUN_NONAKTIF", "login penyuluh yang ditolak");
  });

  it("POST, PATCH, DELETE /users: buat aktif, duplikat 409, nonaktifkan mengunci login, hapus 204", async (ctx) => {
    if (!admin) return ctx.skip("Tidak ada kredensial admin.");
    const id = namaUnik("adm");
    const body = { nama: "Pengguna Uji Admin", username: id, email: `${id}@kontrak.test`, password: "Rahasia123", role: "penyuluh", no_whatsapp: nomorWa() };
    const dibuat = cocokkan(dataEnvelope(UserSchema), await panggil("POST", "/users", { token: admin.token, body }), "POST /users", 201).data;
    catatPengguna(dibuat.id_user);
    expect(dibuat).toMatchObject({ role: "penyuluh", status_akun: "aktif", username: id });
    harapkanGalat(await panggil("POST", "/users", { token: admin.token, body }), 409, "DUPLIKAT", "POST /users (ulang)");

    const nonaktif = await panggil("PATCH", `/users/${dibuat.id_user}`, { token: admin.token, body: { status_akun: "nonaktif" } });
    expect(cocokkan(dataEnvelope(UserSchema), nonaktif, "PATCH /users/{id}").data.status_akun).toBe("nonaktif");
    harapkanGalat(await panggil("POST", "/auth/login", { body: { username: id, password: "Rahasia123" } }), 403, "AKUN_NONAKTIF", "login akun nonaktif");

    harapkanTanpaIsi(await panggil("DELETE", `/users/${dibuat.id_user}`, { token: admin.token }), `DELETE /users/${dibuat.id_user}`);
    harapkanGalat(await panggil("PATCH", `/users/${dibuat.id_user}`, { token: admin.token, body: { nama: "Hantu" } }), 404, "TIDAK_DITEMUKAN", "PATCH /users (sudah dihapus)");
  });
});

/* -------------------------------------------------------------------- */
/* 10. Batas peran (KONTRAK bagian 2: AKSES_DITOLAK)                    */
/* -------------------------------------------------------------------- */

describe("Batas peran", () => {
  it("petani tidak boleh membuka fitur penyuluh dan admin: 403 AKSES_DITOLAK", async () => {
    harapkanGalat(await panggil("GET", "/rekomendasi/antrean-validasi", { token: utama.token }), 403, "AKSES_DITOLAK", "petani -> antrean validasi");
    harapkanGalat(await panggil("PATCH", "/rekomendasi/1/koreksi", { token: utama.token, body: { aksi: "setujui" } }), 403, "AKSES_DITOLAK", "petani -> koreksi");
    harapkanGalat(await panggil("GET", "/users", { token: utama.token }), 403, "AKSES_DITOLAK", "petani -> daftar pengguna");
    harapkanGalat(await panggil("PATCH", "/users/1/approve", { token: utama.token, body: { keputusan: "setujui" } }), 403, "AKSES_DITOLAK", "petani -> approve");
  });

  it("penyuluh tidak boleh memakai fitur petani: 403 AKSES_DITOLAK", async (ctx) => {
    if (!penyuluh) return ctx.skip("Tidak ada akun penyuluh.");
    const t = penyuluh.token;
    harapkanGalat(await panggil("POST", "/simulasi/waktu-tanam", { token: t, body: { id_lahan: utama.idLahan, tanggal_tanam: tanggalNanti(1) } }), 403, "AKSES_DITOLAK", "penyuluh -> simulasi");
    harapkanGalat(await panggil("POST", "/lahan", { token: t, body: { nama_lahan: "Lahan Penyuluh", lokasi: { lat: -7.6, lon: 111.5 } } }), 403, "AKSES_DITOLAK", "penyuluh -> POST /lahan");
    harapkanGalat(await panggil("GET", "/notifikasi", { token: t }), 403, "AKSES_DITOLAK", "penyuluh -> notifikasi");
  });

  it("penyuluh boleh GET /lahan (lahan binaan) dengan bentuk yang sama", async (ctx) => {
    if (!penyuluh) return ctx.skip("Tidak ada akun penyuluh.");
    cocokkan(dataEnvelope(z.array(LahanSchema)), await panggil("GET", "/lahan", { token: penyuluh.token }), "GET /lahan (penyuluh)");
  });
});
