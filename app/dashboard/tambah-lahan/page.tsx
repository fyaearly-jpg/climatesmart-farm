// app/dashboard/tambah-lahan/page.tsx
// Halaman lama digantikan oleh "Lahan saya" (/dashboard/lahan), yang memuat daftar, tambah, ubah, dan hapus.
// Pengalihan ini menjaga tautan atau penanda lama tetap berfungsi.
import { redirect } from "next/navigation";

export default function TambahLahanPage() {
  redirect("/dashboard/lahan");
}
