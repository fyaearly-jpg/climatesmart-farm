# Uji kontrak

Memanggil backend (asli atau tiruan) dan memeriksa setiap respons terhadap **KONTRAK API v1.0** memakai skema Zod
yang sama dengan frontend. Tujuannya: begitu satu endpoint backend selesai, pemegang backend langsung tahu apakah
bentuk datanya cocok, tanpa menunggu pemegang frontend menemukan galat di layar.

## Menjalankan

```powershell
npm run test:contract
```

Target diambil dari `CONTRACT_BASE_URL`, kalau tidak ada dari `BACKEND_URL` di `.env.local`, kalau tidak ada
`http://127.0.0.1:5000`. Ke backend lain, di PowerShell:

```powershell
$env:CONTRACT_BASE_URL = 'http://127.0.0.1:5001'; npm run test:contract
```

Tidak butuh frontend menyala. Uji ini memanggil Flask langsung.

## Pengaman

Uji ini **membuat data** (akun `uji_...`, lahan, musim tanam). Karena itu ia **menolak berjalan ke host selain
lokal** (`localhost`, `127.0.0.1`, `::1`, `host.docker.internal`). Untuk server uji khusus yang memang boleh dikotori,
isi `CONTRACT_ALLOW_REMOTE=1`. Jangan pernah diarahkan ke produksi.

## Variabel opsional

| Variabel | Fungsi |
|---|---|
| `CONTRACT_ADMIN_USER`, `CONTRACT_ADMIN_PASS` | Akun admin. Mengaktifkan uji admin, membuat akun penyuluh lewat persetujuan, dan **membersihkan semua akun uji** di akhir |
| `CONTRACT_PENYULUH_USER`, `CONTRACT_PENYULUH_PASS` | Akun penyuluh yang sudah ada. Tanpa ini tetapi dengan admin, penyuluh dibuat sendiri |
| `CONTRACT_KOREKSI=1` | Mengaktifkan uji koreksi penyuluh. Ini **mengubah status rekomendasi**, jadi nonaktif secara bawaan di backend asli |
| `CONTRACT_ALLOW_REMOTE=1` | Mengizinkan target non-lokal (lihat Pengaman) |

Terhadap server tiruan (`tools/mock_server.py`) semuanya otomatis aktif: terdeteksi dari `/health` yang menjawab
`"database": "mock"`, dan akun contohnya dipakai.

## Membaca hasil

- **Hijau**: sesuai KONTRAK.
- **Merah**: pesan menyebut endpoint, status HTTP, dan field yang salah. Contoh:
  ```
  [KONTRAK] GET /lahan/5/prediksi: bentuk respons tidak sesuai skema
    - data.penyakit.0.alasan: Alasan prediksi wajib ada (NFR-08)
    - data.jadwal.1.status: Invalid option: expected one of "direkomendasikan"|"ditunda"|"siaga"
  ```
  Perbaiki di backend, bukan di uji, kecuali KONTRAK-nya sendiri yang salah (kalau begitu ubah KONTRAK lewat
  Pull Request lebih dulu, lalu frontend dan uji ini menyesuaikan).
- **Dilewati (skipped)**: prasyarat tidak ada. Pesannya menyebut apa yang kurang (misalnya kredensial admin, atau
  data cuaca belum tersedia). Dilewati bukan berarti lulus.

## Yang diperiksa

Konvensi umum (amplop galat JSON, bukan HTML), autentikasi dan akun, lahan, musim tanam (termasuk batas fase
HST 14/15/55/56), cuaca, prediksi dan aturan tampilan saran, jadwal, simulasi (0 sampai 9 hari, di bawah 5 detik,
tidak menyimpan), notifikasi, antrean validasi dan koreksi penyuluh, admin, dan batas peran.

## Yang belum diperiksa

- `TOKEN_KEDALUWARSA` (butuh menunggu 30 menit atau token dengan masa berlaku pendek).
- Endpoint **[Should]** di KONTRAK bagian 10 dan 11 (tindak lanjut, laporan serangan, riwayat, katalog, monitoring).
- `POST /internal/generate`.

## Menambah pemeriksaan

1. Tambahkan `it(...)` di `kontrak.contract.ts` pada kelompok yang sesuai.
2. Aturan logika yang tidak bisa dinyatakan skema Zod ditaruh di `aturan.ts`.
3. Skema yang hanya dipakai uji ini ditaruh di `skema-tambahan.ts`.
