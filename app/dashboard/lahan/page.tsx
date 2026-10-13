"use client";

// app/dashboard/lahan/page.tsx
// Lahan Saya: daftar, tambah, ubah, dan hapus lahan lewat API (KONTRAK bagian 4).
// Komoditas dikunci padi, jadi formulir hanya berisi nama dan koordinat.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useId, useState } from "react";
import { api, getErrorMessage, queryKeys } from "@/lib/api";
import { formatKoordinat, parseAngka } from "@/lib/form";
import { type Lahan, type LahanInput, LahanInputSchema } from "@/lib/schemas";

const kelasInput =
  "h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:text-white aria-[invalid=true]:border-red-400";
const kelasLabel = "text-sm font-medium text-stone-700 dark:text-stone-200";
const kelasKartu =
  "min-w-0 rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5";
const tombolUtama =
  "rounded-full bg-gradient-to-br from-brand-500 to-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 disabled:opacity-60";
const tombolSekunder =
  "rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-60 dark:border-white/20 dark:text-stone-200 dark:hover:bg-white/10";
const tombolBahaya =
  "rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60";
const redup = "text-stone-500 dark:text-stone-400";

const PESAN_LOKASI: Record<number, string> = {
  1: "Izin lokasi ditolak. Isi koordinat secara manual, atau izinkan lokasi di pengaturan browser.",
  2: "Lokasi perangkat tidak tersedia. Isi koordinat secara manual.",
  3: "Mencari lokasi terlalu lama. Coba lagi atau isi koordinat secara manual.",
};

interface NilaiForm {
  nama: string;
  lat: string;
  lon: string;
}
type GalatForm = Partial<Record<keyof NilaiForm, string>>;

function nilaiDari(l: Lahan): NilaiForm {
  return { nama: l.nama_lahan, lat: String(l.lokasi.lat), lon: String(l.lokasi.lon) };
}

interface KolomProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  galat: string | undefined;
  placeholder: string;
  inputMode?: "text" | "decimal";
  hint?: string;
}

function Kolom({
  id,
  label,
  value,
  onChange,
  galat,
  placeholder,
  inputMode = "text",
  hint,
}: KolomProps) {
  const deskripsi = [galat ? `${id}-galat` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={kelasLabel}>
        {label}
      </label>
      <input
        id={id}
        autoComplete="off"
        inputMode={inputMode}
        className={kelasInput}
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(galat)}
        aria-describedby={deskripsi || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && (
        <p id={`${id}-hint`} className={`text-xs ${redup}`}>
          {hint}
        </p>
      )}
      {galat && (
        <p id={`${id}-galat`} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {galat}
        </p>
      )}
    </div>
  );
}

interface FormLahanProps {
  awal?: NilaiForm;
  labelSimpan: string;
  pending: boolean;
  galatServer: string | null;
  onSimpan: (input: LahanInput) => void;
  onBatal?: () => void;
}

function FormLahan({ awal, labelSimpan, pending, galatServer, onSimpan, onBatal }: FormLahanProps) {
  const uid = useId();
  const [nilai, setNilai] = useState<NilaiForm>(awal ?? { nama: "", lat: "", lon: "" });
  const [galat, setGalat] = useState<GalatForm>({});
  const [bisaLokasi, setBisaLokasi] = useState(false);
  const [lokasi, setLokasi] = useState<{ memuat: boolean; pesan: string | null }>({
    memuat: false,
    pesan: null,
  });

  // Diperiksa setelah mount agar HTML server dan klien sama (tidak ada navigator di server).
  useEffect(() => {
    setBisaLokasi("geolocation" in navigator);
  }, []);

  function ubah(kunci: keyof NilaiForm, v: string) {
    setNilai((n) => ({ ...n, [kunci]: v }));
  }

  function pakaiLokasi() {
    setLokasi({ memuat: true, pesan: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNilai((n) => ({
          ...n,
          lat: pos.coords.latitude.toFixed(6),
          lon: pos.coords.longitude.toFixed(6),
        }));
        setGalat({});
        setLokasi({
          memuat: false,
          pesan: "Koordinat terisi dari lokasi perangkat. Periksa lagi sebelum menyimpan.",
        });
      },
      (err) =>
        setLokasi({
          memuat: false,
          pesan: PESAN_LOKASI[err.code] ?? "Lokasi tidak dapat diambil.",
        }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  function kirim(e: FormEvent) {
    e.preventDefault();
    const parsed = LahanInputSchema.safeParse({
      nama_lahan: nilai.nama,
      lokasi: { lat: parseAngka(nilai.lat), lon: parseAngka(nilai.lon) },
    });
    if (!parsed.success) {
      const baru: GalatForm = {};
      for (const issue of parsed.error.issues) {
        let kunci: keyof NilaiForm = "lat";
        if (issue.path[0] === "nama_lahan") kunci = "nama";
        else if (issue.path[1] === "lon") kunci = "lon";
        baru[kunci] ??= issue.message;
      }
      setGalat(baru);
      return;
    }
    setGalat({});
    onSimpan(parsed.data);
  }

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-4">
      <Kolom
        id={`${uid}-nama`}
        label="Nama lahan"
        value={nilai.nama}
        onChange={(v) => ubah("nama", v)}
        galat={galat.nama}
        placeholder="Contoh: Sawah Utara"
      />
      {bisaLokasi && (
        <div>
          <button
            type="button"
            onClick={pakaiLokasi}
            disabled={lokasi.memuat}
            className={tombolSekunder}
          >
            {lokasi.memuat ? "Mencari lokasi..." : "Pakai lokasi saya"}
          </button>
          {lokasi.pesan && (
            <p role="status" className={`mt-2 text-xs ${redup}`}>
              {lokasi.pesan}
            </p>
          )}
        </div>
      )}
      <Kolom
        id={`${uid}-lat`}
        label="Latitude"
        value={nilai.lat}
        onChange={(v) => ubah("lat", v)}
        galat={galat.lat}
        placeholder="-7.6298"
        inputMode="decimal"
        hint="Di Google Maps: klik kanan pada lokasi lahan, lalu salin angka pertama."
      />
      <Kolom
        id={`${uid}-lon`}
        label="Longitude"
        value={nilai.lon}
        onChange={(v) => ubah("lon", v)}
        galat={galat.lon}
        placeholder="111.5239"
        inputMode="decimal"
        hint="Angka kedua dari koordinat yang sama."
      />
      {galatServer && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {galatServer}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} aria-busy={pending} className={tombolUtama}>
          {pending ? "Menyimpan..." : labelSimpan}
        </button>
        {onBatal && (
          <button type="button" onClick={onBatal} className={tombolSekunder}>
            Batal
          </button>
        )}
      </div>
    </form>
  );
}

export default function LahanSayaPage() {
  const queryClient = useQueryClient();
  const [pesan, setPesan] = useState<string | null>(null);
  const [kunciForm, setKunciForm] = useState(0);
  const [diubah, setDiubah] = useState<number | null>(null);
  const [dihapus, setDihapus] = useState<number | null>(null);

  const lahanQuery = useQuery({ queryKey: queryKeys.lahan, queryFn: api.lahan.list });
  const muatUlang = () => queryClient.invalidateQueries({ queryKey: queryKeys.lahan });

  const tambah = useMutation({
    mutationFn: (input: LahanInput) => api.lahan.create(input),
    onSuccess: (l) => {
      setPesan(`Lahan "${l.nama_lahan}" ditambahkan.`);
      setKunciForm((k) => k + 1);
      void muatUlang();
    },
  });
  const ubahLahan = useMutation({
    mutationFn: (v: { id: number; input: LahanInput }) => api.lahan.update(v.id, v.input),
    onSuccess: (l) => {
      setPesan(`Lahan "${l.nama_lahan}" diperbarui.`);
      setDiubah(null);
      void muatUlang();
    },
  });
  const hapus = useMutation({
    mutationFn: (id: number) => api.lahan.remove(id),
    onSuccess: (_data, id) => {
      setPesan("Lahan dihapus.");
      setDihapus(null);
      queryClient.removeQueries({ queryKey: ["lahan", id] });
      void muatUlang();
    },
  });

  function mulaiUbah(id: number) {
    setPesan(null);
    setDihapus(null);
    ubahLahan.reset();
    setDiubah(id);
  }
  function mulaiHapus(id: number) {
    setPesan(null);
    setDiubah(null);
    hapus.reset();
    setDihapus(id);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-800 dark:text-white">Lahan saya</h1>
        <p className={`mt-1 text-sm ${redup}`}>
          Daftarkan lahan padi Anda. Koordinat dipakai untuk mengambil prakiraan cuaca di lokasi
          yang tepat.
        </p>
      </header>

      <div aria-live="polite">
        {pesan && (
          <p
            role="status"
            className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950"
          >
            {pesan}
          </p>
        )}
      </div>

      {lahanQuery.isPending && (
        <p role="status" className={`text-sm ${redup}`}>
          Memuat lahan...
        </p>
      )}

      {lahanQuery.isError && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          <p>{getErrorMessage(lahanQuery.error)}</p>
          <button
            type="button"
            className="mt-1 underline"
            onClick={() => void lahanQuery.refetch()}
          >
            Coba lagi
          </button>
        </div>
      )}

      {lahanQuery.isSuccess && lahanQuery.data.length === 0 && (
        <p className={`${kelasKartu} text-center text-sm text-stone-700 dark:text-stone-300`}>
          Anda belum punya lahan. Tambahkan lahan pertama Anda di bawah.
        </p>
      )}

      {lahanQuery.isSuccess && lahanQuery.data.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {lahanQuery.data.map((l) => (
            <li key={l.id_lahan}>
              <article className={kelasKartu}>
                {diubah === l.id_lahan ? (
                  <>
                    <h2 className="mb-4 font-semibold text-stone-800 dark:text-white">
                      Ubah lahan
                    </h2>
                    <FormLahan
                      awal={nilaiDari(l)}
                      labelSimpan="Simpan perubahan"
                      pending={ubahLahan.isPending}
                      galatServer={ubahLahan.isError ? getErrorMessage(ubahLahan.error) : null}
                      onSimpan={(input) => ubahLahan.mutate({ id: l.id_lahan, input })}
                      onBatal={() => setDiubah(null)}
                    />
                  </>
                ) : (
                  <>
                    <h2 className="font-semibold text-stone-800 dark:text-white">{l.nama_lahan}</h2>
                    <p className={`mt-1 text-sm ${redup}`}>
                      Padi · {formatKoordinat(l.lokasi.lat, l.lokasi.lon)}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${l.lokasi.lat},${l.lokasi.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm font-semibold text-brand-700 underline dark:text-brand-300"
                    >
                      Lihat di peta<span className="sr-only"> (tab baru)</span>
                    </a>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        aria-label={`Ubah ${l.nama_lahan}`}
                        onClick={() => mulaiUbah(l.id_lahan)}
                        className={tombolSekunder}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        aria-label={`Hapus ${l.nama_lahan}`}
                        onClick={() => mulaiHapus(l.id_lahan)}
                        className={tombolSekunder}
                      >
                        Hapus
                      </button>
                    </div>
                    {dihapus === l.id_lahan && (
                      <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                        <p>Hapus lahan {l.nama_lahan}? Tindakan ini tidak dapat dibatalkan.</p>
                        {hapus.isError && (
                          <p role="alert" className="mt-1 font-medium">
                            {getErrorMessage(hapus.error)}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={hapus.isPending}
                            onClick={() => hapus.mutate(l.id_lahan)}
                            className={tombolBahaya}
                          >
                            {hapus.isPending ? "Menghapus..." : "Ya, hapus"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDihapus(null)}
                            className={tombolSekunder}
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}

      <section className={kelasKartu} aria-labelledby="judul-tambah">
        <h2 id="judul-tambah" className="mb-4 font-semibold text-stone-800 dark:text-white">
          Tambah lahan baru
        </h2>
        <FormLahan
          key={kunciForm}
          labelSimpan="Tambah lahan"
          pending={tambah.isPending}
          galatServer={tambah.isError ? getErrorMessage(tambah.error) : null}
          onSimpan={(input) => {
            setPesan(null);
            tambah.mutate(input);
          }}
        />
      </section>
    </div>
  );
}
