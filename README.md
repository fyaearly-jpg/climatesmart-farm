# 🌱 ClimateSmart Farm — Konsol Next.js

Live Production: https://climatesmart-farm.vercel.app

Platform rekomendasi tani berbasis AI, cuaca real-time, sensor IoT, dan
validasi Penyuluh. Dibangun dengan Next.js 16 App Router (React Server
Components), Zustand, TanStack Query v5, Zod, dan Tailwind CSS v4.

Proyek ini adalah kelanjutan langsung dari `csf-react-console` (Modul 5/7,
Vite SPA) — domain data dan skema Zod dipertahankan sama, diarsiteksi ulang
sebagai aplikasi Next.js App Router untuk Modul 6 & Proyek Akhir.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

## Akun demo

| Peran     | Email               | Kata sandi   |
|-----------|----------------------|--------------|
| Petani    | petani@demo.csf     | petani123    |
| Penyuluh  | penyuluh@demo.csf   | penyuluh123  |
| Admin     | admin@demo.csf      | admin1234    |

Data disimpan in-memory (server restart = data kembali ke seed awal) —
prototipe akademik, bukan basis data produksi sungguhan.

## Skrip yang tersedia

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Development server (Turbopack HMR) |
| `npm run build` | Production build |
| `npm run start` | Menjalankan hasil build produksi |
| `npm run lint` | Biome — cek lint & format |
| `npm run lint:fix` | Biome — perbaiki otomatis |

## Arsitektur singkat

- **Server Components (RSC)** untuk fetch data awal & tampilan read-only
  (`app/dashboard/page.tsx`, panel-panel di `components/panels/`) — nol
  bundle JS untuk logika ini.
- **Client Components** hanya pada "daun" yang butuh interaktivitas
  (`components/modules/*Client.tsx`) — form, filter, tombol aksi.
- **Zustand** (`store/useUIStore.ts`) untuk Client UI State murni (sidebar,
  filter, tema) — tidak pernah menyimpan data hasil fetch API.
- **TanStack Query v5** (`hooks/*Query.ts`) untuk Server State, memanggil
  **Route Handler** (`app/api/**/route.ts`) yang membaca/menulis lapisan
  data server-only di `lib/data/*.ts`.
- **`proxy.ts`** (dahulu `middleware.ts`, konvensi baru Next.js 16)
  melindungi rute `/dashboard/*` berdasarkan cookie sesi httpOnly.

## Deploy ke Vercel (tanpa CLI, ±2 menit)

1. Push repo ini ke GitHub (lihat langkah di bawah).
2. Buka https://vercel.com/new, klik **Import Git Repository**, pilih repo
   ini.
3. Biarkan semua pengaturan default (Vercel otomatis mendeteksi Next.js) →
   klik **Deploy**.
4. Setiap push ke branch `main` setelah ini akan otomatis re-deploy.

## Push pertama kali ke GitHub

```bash
git init
git add .
git commit -m "Initial commit: ClimateSmart Farm Next.js portal"
git branch -M main
git remote add origin https://github.com/<username-kamu>/csf-nextjs-portal.git
git push -u origin main
```

Ganti `<username-kamu>` dengan username GitHub kamu, dan buat repo kosong
bernama `csf-nextjs-portal` dulu di github.com/new sebelum menjalankan
`git push`.
