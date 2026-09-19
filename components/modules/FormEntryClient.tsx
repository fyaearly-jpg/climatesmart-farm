// components/modules/FormEntryClient.tsx — Client leaf (Modul 5/7 pattern, Tailwind v4)
"use client";

import { type FormEvent, useState } from "react";
import { useCreateRecommendationMutation } from "@/hooks/useRecommendationsQuery";
import { type PlotRegistrationInput, PlotRegistrationSchema } from "@/lib/schemas";
import { Button } from "../ui/Button";

type FieldErrors = Partial<Record<keyof PlotRegistrationInput, string>>;

const initialForm = {
  plotName: "",
  commodity: "",
  areaHectare: "",
  activity: "TANAM" as const,
  scheduledDate: "",
};

const inputClass =
  "h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:text-white aria-[invalid=true]:border-red-400";

export function FormEntryClient() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const createMutation = useCreateRecommendationMutation();

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    createMutation.reset();
    const result = PlotRegistrationSchema.safeParse(form);
    if (!result.success) {
      const flattened = result.error.flatten().fieldErrors;
      const next: FieldErrors = {};
      (Object.keys(flattened) as (keyof PlotRegistrationInput)[]).forEach((key) => {
        const msg = flattened[key]?.[0];
        if (msg) next[key] = msg;
      });
      setErrors(next);
      return;
    }
    setErrors({});
    createMutation.mutate(result.data, { onSuccess: () => setForm(initialForm) });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="plotName"
          className="text-sm font-medium text-stone-700 dark:text-stone-200"
        >
          Nama Lahan
        </label>
        <input
          id="plotName"
          className={inputClass}
          value={form.plotName}
          aria-invalid={Boolean(errors.plotName)}
          onChange={(e) => updateField("plotName", e.target.value)}
        />
        {errors.plotName && (
          <p role="alert" className="text-xs text-red-600">
            {errors.plotName}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="commodity"
          className="text-sm font-medium text-stone-700 dark:text-stone-200"
        >
          Komoditas
        </label>
        <input
          id="commodity"
          className={inputClass}
          value={form.commodity}
          aria-invalid={Boolean(errors.commodity)}
          onChange={(e) => updateField("commodity", e.target.value)}
        />
        {errors.commodity && (
          <p role="alert" className="text-xs text-red-600">
            {errors.commodity}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="areaHectare"
          className="text-sm font-medium text-stone-700 dark:text-stone-200"
        >
          Luas Lahan (Ha)
        </label>
        <input
          id="areaHectare"
          type="number"
          step="0.1"
          className={inputClass}
          value={form.areaHectare}
          aria-invalid={Boolean(errors.areaHectare)}
          onChange={(e) => updateField("areaHectare", e.target.value)}
        />
        {errors.areaHectare && (
          <p role="alert" className="text-xs text-red-600">
            {errors.areaHectare}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="activity"
          className="text-sm font-medium text-stone-700 dark:text-stone-200"
        >
          Jenis Aktivitas
        </label>
        <select
          id="activity"
          className={inputClass}
          value={form.activity}
          onChange={(e) => updateField("activity", e.target.value as typeof form.activity)}
        >
          <option value="TANAM">Tanam</option>
          <option value="PUPUK">Pupuk</option>
          <option value="SEMPROT">Semprot</option>
          <option value="PANEN">Panen</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="scheduledDate"
          className="text-sm font-medium text-stone-700 dark:text-stone-200"
        >
          Tanggal Jadwal
        </label>
        <input
          id="scheduledDate"
          type="date"
          className={inputClass}
          value={form.scheduledDate}
          aria-invalid={Boolean(errors.scheduledDate)}
          onChange={(e) => updateField("scheduledDate", e.target.value)}
        />
        {errors.scheduledDate && (
          <p role="alert" className="text-xs text-red-600">
            {errors.scheduledDate}
          </p>
        )}
      </div>

      {createMutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          {createMutation.error instanceof Error
            ? createMutation.error.message
            : "Gagal menyimpan data lahan."}
        </p>
      )}
      {createMutation.isSuccess && (
        <p role="status" className="text-sm text-brand-700 dark:text-brand-300">
          Lahan &quot;{createMutation.data.plotName}&quot; berhasil didaftarkan (status MENUNGGU).
        </p>
      )}

      <Button
        type="submit"
        disabled={createMutation.isPending}
        aria-busy={createMutation.isPending}
        className="mt-2"
      >
        {createMutation.isPending ? "Menyimpan…" : "Simpan Data Lahan"}
      </Button>
    </form>
  );
}
