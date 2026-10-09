"use client";

// app/dashboard/validasi/page.tsx
// FR-16 Antrean Validasi dan Koreksi Penyuluh.
// Urutan antrean sudah ditentukan backend (tingkat, sisa waktu, fase rentan); frontend
// tidak mengurutkan ulang. Koreksi lewat PATCH /rekomendasi/{id}/koreksi.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ValidationQueueCard } from "@/components/ValidationQueueCard";
import { api, getErrorMessage, queryKeys } from "@/lib/api";
import {
  type AksiKoreksi,
  type AntreanValidasiItem,
  type KoreksiHasil,
  KoreksiInputSchema,
  type Tingkat,
  TingkatEnum,
} from "@/lib/schemas";

const REFETCH_MS = 60_000;

const PILIHAN_AKSI: { nilai: AksiKoreksi; judul: string; bantuan: string }[] = [
  { nilai: "setujui", judul: "Setujui", bantuan: "Saran dikirim ke petani apa adanya." },
  {
    nilai: "ubah",
    judul: "Ubah",
    bantuan: "Tentukan tingkat dan saran baru, lalu kirim ke petani.",
  },
  { nilai: "tolak", judul: "Tolak", bantuan: "Tidak ada saran yang dikirim ke petani." },
];

const LABEL_TINGKAT: Record<Tingkat, string> = {
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
};

const kelasInput =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700";

export default function ValidasiPage() {
  const [dipilih, setDipilih] = useState<AntreanValidasiItem | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  const antrean = useQuery({
    queryKey: queryKeys.antreanValidasi,
    queryFn: api.validasi.antrean,
    refetchInterval: REFETCH_MS,
  });

  const jumlahMendesak = antrean.data?.filter((i) => i.mendesak).length ?? 0;

  return (
    <main className="mx-auto w-full max-w-4xl min-w-0 space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Antrean validasi</h1>
        <p className="mt-1 text-sm text-slate-700">
          Rekomendasi hama dan penyakit berisiko tinggi menunggu saran Anda. Jika lewat 24 jam,
          saran terkirim ke petani dengan label belum divalidasi.
        </p>
        {antrean.isSuccess && antrean.data.length > 0 && (
          <p className="mt-2 text-sm font-medium text-slate-900">
            {antrean.data.length} menunggu
            {jumlahMendesak > 0 && `, ${jumlahMendesak} mendesak`}
          </p>
        )}
      </header>

      <div aria-live="polite">
        {pesan && (
          <p
            role="status"
            className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950"
          >
            {pesan}
          </p>
        )}
      </div>

      {antrean.isPending && (
        <p role="status" className="text-sm text-slate-600">
          Memuat antrean...
        </p>
      )}

      {antrean.isError && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        >
          <p>{getErrorMessage(antrean.error)}</p>
          <button type="button" className="mt-1 underline" onClick={() => void antrean.refetch()}>
            Coba lagi
          </button>
        </div>
      )}

      {antrean.isSuccess && antrean.data.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-700">
          Tidak ada rekomendasi yang menunggu validasi. Antrean diperbarui otomatis setiap menit.
        </p>
      )}

      {antrean.isSuccess && (
        <ul className="space-y-3">
          {antrean.data.map((item) => (
            <li key={item.id_rekomendasi}>
              <ValidationQueueCard
                item={item}
                diterimaPada={antrean.dataUpdatedAt}
                onTinjau={(i) => {
                  setPesan(null);
                  setDipilih(i);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <KoreksiDialog
        item={dipilih}
        onTutup={() => setDipilih(null)}
        onSelesai={(hasil) => {
          setDipilih(null);
          setPesan(
            hasil.notifikasi_terkirim
              ? "Koreksi tersimpan dan saran sudah dikirim ke petani."
              : "Koreksi tersimpan. Tidak ada saran yang dikirim ke petani.",
          );
        }}
      />
    </main>
  );
}

/* -------------------------------------------------------------------- */
/* Dialog koreksi                                                       */
/* -------------------------------------------------------------------- */

interface KoreksiDialogProps {
  item: AntreanValidasiItem | null;
  onTutup: () => void;
  onSelesai: (hasil: KoreksiHasil) => void;
}

function KoreksiDialog({ item, onTutup, onSelesai }: KoreksiDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // jsdom (lingkungan Vitest) belum punya showModal/close, jadi sediakan fallback atribut `open`.
    if (item && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!item && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [item]);

  return (
    <dialog
      ref={ref}
      onClose={onTutup}
      aria-labelledby="koreksi-judul"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg p-0 backdrop:bg-slate-900/50"
    >
      {/* key: state formulir ikut di-reset setiap kali rekomendasi yang ditinjau berganti */}
      {item && (
        <KoreksiForm
          key={item.id_rekomendasi}
          item={item}
          onBatal={onTutup}
          onSelesai={onSelesai}
        />
      )}
    </dialog>
  );
}

function KoreksiForm({
  item,
  onBatal,
  onSelesai,
}: {
  item: AntreanValidasiItem;
  onBatal: () => void;
  onSelesai: (hasil: KoreksiHasil) => void;
}) {
  const queryClient = useQueryClient();
  const [aksi, setAksi] = useState<AksiKoreksi>("setujui");
  const [tingkat, setTingkat] = useState<Tingkat>(item.tingkat);
  const [saranTeks, setSaranTeks] = useState(item.saran_diajukan.join("\n"));
  const [catatan, setCatatan] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const koreksi = useMutation({
    mutationFn: (input: Parameters<typeof api.validasi.koreksi>[1]) =>
      api.validasi.koreksi(item.id_rekomendasi, input),
    onSuccess: (hasil) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.antreanValidasi });
      onSelesai(hasil);
    },
  });

  function kirim(e: FormEvent) {
    e.preventDefault();
    const catatanBersih = catatan.trim() || undefined;
    const kandidat =
      aksi === "ubah"
        ? {
            aksi,
            tingkat,
            saran: saranTeks
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
            catatan: catatanBersih,
          }
        : { aksi, catatan: catatanBersih };

    const parsed = KoreksiInputSchema.safeParse(kandidat);
    if (!parsed.success) {
      const peta: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const kunci = String(issue.path[0] ?? "form");
        peta[kunci] ??= issue.message;
      }
      setErrors(peta);
      return;
    }
    setErrors({});
    koreksi.mutate(parsed.data);
  }

  return (
    <form onSubmit={kirim} className="space-y-4 p-5" noValidate>
      <header>
        <h2 id="koreksi-judul" className="text-lg font-semibold text-slate-900">
          Koreksi {item.nama}
        </h2>
        <p className="text-sm text-slate-700">
          {item.lahan.nama_lahan}, milik {item.lahan.pemilik}. Risiko dari sistem:{" "}
          {LABEL_TINGKAT[item.tingkat].toLowerCase()}.
        </p>
      </header>

      <fieldset>
        <legend className="text-sm font-medium text-slate-900">Keputusan</legend>
        <div className="mt-1 space-y-2">
          {PILIHAN_AKSI.map((p) => (
            <label key={p.nilai} className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name="aksi"
                value={p.nilai}
                checked={aksi === p.nilai}
                onChange={() => setAksi(p.nilai)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-slate-900">{p.judul}</span>
                <span className="block text-slate-600">{p.bantuan}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {aksi === "ubah" && (
        <>
          <div>
            <label htmlFor="tingkat" className="text-sm font-medium text-slate-900">
              Tingkat risiko baru
            </label>
            <select
              id="tingkat"
              className={kelasInput}
              value={tingkat}
              onChange={(e) => setTingkat(TingkatEnum.parse(e.target.value))}
            >
              {TingkatEnum.options.map((t) => (
                <option key={t} value={t}>
                  {LABEL_TINGKAT[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="saran" className="text-sm font-medium text-slate-900">
              Saran baru untuk petani
            </label>
            <textarea
              id="saran"
              rows={4}
              className={kelasInput}
              value={saranTeks}
              onChange={(e) => setSaranTeks(e.target.value)}
              aria-invalid={errors.saran ? true : undefined}
              aria-describedby={errors.saran ? "saran-error" : "saran-bantuan"}
            />
            <p id="saran-bantuan" className="mt-1 text-xs text-slate-600">
              Satu saran per baris.
            </p>
            {errors.saran && (
              <p id="saran-error" role="alert" className="mt-1 text-sm text-red-800">
                {errors.saran}
              </p>
            )}
          </div>
        </>
      )}

      <div>
        <label htmlFor="catatan" className="text-sm font-medium text-slate-900">
          Catatan untuk petani (opsional)
        </label>
        <textarea
          id="catatan"
          rows={2}
          maxLength={120}
          className={kelasInput}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          aria-invalid={errors.catatan ? true : undefined}
          aria-describedby="catatan-bantuan"
        />
        <p id="catatan-bantuan" className="mt-1 text-xs text-slate-600">
          {catatan.length}/120 karakter
        </p>
        {errors.catatan && (
          <p role="alert" className="mt-1 text-sm text-red-800">
            {errors.catatan}
          </p>
        )}
      </div>

      {koreksi.isError && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        >
          {getErrorMessage(koreksi.error)}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onBatal}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={koreksi.isPending}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          {koreksi.isPending ? "Menyimpan..." : "Simpan koreksi"}
        </button>
      </div>
    </form>
  );
}
