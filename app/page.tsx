// app/page.tsx - Landing page (Server Component murni, 0 KB client JS)
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "ClimateSmart Farm: Rekomendasi Tani Berbasis AI",
  description:
    "Platform rekomendasi jadwal tani berbasis cuaca real-time, sensor IoT, dan AI, dengan alur validasi Penyuluh untuk petani Indonesia.",
};

const features = [
  {
    title: "Rekomendasi AI Real-Time",
    desc: "Jadwal tanam, pupuk, semprot, dan panen disesuaikan otomatis dengan kondisi cuaca dan sensor lahan terkini.",
    icon: "🌾",
  },
  {
    title: "Deteksi Risiko Cuaca",
    desc: "Peringatan dini risiko cuaca ekstrem (hujan lebat, kekeringan) agar Petani bisa mengambil keputusan lebih cepat.",
    icon: "⛅",
  },
  {
    title: "Validasi oleh Penyuluh",
    desc: "Setiap rekomendasi AI ditinjau oleh Penyuluh Pertanian resmi sebelum dijalankan di lapangan, bukan sekadar model tanpa pengawasan.",
    icon: "✅",
  },
  {
    title: "Sensor IoT Kelembapan Lahan",
    desc: "Data kelembapan tanah dan status irigasi termonitor langsung dari perangkat di lahan.",
    icon: "📡",
  },
];

const roles = [
  {
    role: "Petani",
    desc: "Daftarkan lahan, lihat rekomendasi AI, pantau cuaca & sensor lahan sendiri.",
  },
  {
    role: "Penyuluh",
    desc: "Tinjau dan validasi (setujui/tolak) rekomendasi AI sebelum dijalankan Petani.",
  },
  {
    role: "Admin",
    desc: "Kelola pengguna dan pantau statistik penggunaan platform secara menyeluruh.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white dark:from-brand-950 dark:via-stone-950 dark:to-stone-950">
      <header className="sticky top-0 z-20 border-b border-white/40 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-stone-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-brand-800 dark:text-brand-200">
            🌱 ClimateSmart Farm
          </span>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-brand-800 hover:underline dark:text-brand-200"
            >
              Masuk
            </Link>
            <Link href="/register">
              <Button size="sm">Daftar Gratis</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-block rounded-full bg-brand-100 px-4 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
              Platform Rekomendasi Tani Cerdas
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-brand-900 md:text-5xl dark:text-white">
              Tanam lebih tepat waktu, panen lebih optimal.
            </h1>
            <p className="mt-5 max-w-md text-base text-stone-600 dark:text-stone-300">
              ClimateSmart Farm memadukan data cuaca, sensor IoT, dan rekomendasi AI divalidasi
              langsung oleh Penyuluh Pertanian supaya keputusan di lahan Anda selalu berbasis
              data.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg">Mulai Sekarang →</Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="ghost">
                  Saya sudah punya akun
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-300/40 to-amber-glow/30 blur-2xl" />
            <div className="overflow-hidden rounded-[1.75rem] shadow-2xl shadow-brand-900/20 ring-1 ring-white/50">
              <Image
                src="https://images.pexels.com/photos/19104382/pexels-photo-19104382.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Petani memanen padi di sawah hijau, Denpasar, Bali"
                width={1200}
                height={800}
                priority
                fetchPriority="high"
                sizes="(min-width: 768px) 560px, 100vw"
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-2xl font-bold text-brand-900 dark:text-white">
            Semua yang Petani &amp; Penyuluh butuhkan
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-brand-900/5 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/5"
              >
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 font-semibold text-brand-900 dark:text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid grid-cols-3 gap-3 overflow-hidden rounded-2xl">
            <Image
              src="https://images.pexels.com/photos/35544010/pexels-photo-35544010.jpeg?auto=compress&cs=tinysrgb&w=600"
              alt="Petani menanam padi di Jogja"
              width={600}
              height={400}
              className="h-40 w-full object-cover md:h-56"
            />
            <Image
              src="https://images.pexels.com/photos/9293267/pexels-photo-9293267.jpeg?auto=compress&cs=tinysrgb&w=600"
              alt="Petani merawat tanaman padi"
              width={600}
              height={400}
              className="h-40 w-full object-cover md:h-56"
            />
            <Image
              src="https://images.pexels.com/photos/32260368/pexels-photo-32260368.jpeg?auto=compress&cs=tinysrgb&w=600"
              alt="Petani bekerja di sawah Klaten"
              width={600}
              height={400}
              className="h-40 w-full object-cover md:h-56"
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-2xl font-bold text-brand-900 dark:text-white">
            Satu platform, tiga peran
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {roles.map((r) => (
              <div
                key={r.role}
                className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-xl shadow-brand-900/30"
              >
                <h3 className="text-lg font-bold">{r.role}</h3>
                <p className="mt-2 text-sm text-brand-100">{r.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-20 text-center">
          <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-8 py-14 text-white shadow-2xl">
            <h2 className="text-2xl font-bold md:text-3xl">Siap memodernisasi lahan Anda?</h2>
            <p className="mx-auto mt-3 max-w-md text-brand-100">
              Daftar gratis dalam kurang dari satu menit, dan dapatkan rekomendasi tani pertama Anda
              hari ini.
            </p>
            <Link href="/register" className="mt-6 inline-block">
              <Button size="lg" variant="secondary">
                Daftar Sekarang
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/40 py-8 text-center text-xs text-stone-500 dark:border-white/10 dark:text-stone-400">
        © 2026 ClimateSmart Farm - D3 Teknik Informatika SV UNS Kab. Madiun
      </footer>
    </div>
  );
}
