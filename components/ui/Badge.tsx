// components/ui/Badge.tsx — CVA + Tailwind v4, presentational (bisa RSC)
import { cva } from "class-variance-authority";
import type { ActivityType, RiskLevel, ValidationStatus } from "@/lib/schemas";

const base =
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset";

const activityBadgeVariants = cva(base, {
  variants: {
    activity: {
      TANAM:
        "bg-brand-50 text-brand-700 ring-brand-300 dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-700",
      PUPUK:
        "bg-amber-50 text-amber-800 ring-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700",
      SEMPROT:
        "bg-sky-50 text-sky-800 ring-sky-300 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-700",
      PANEN:
        "bg-orange-50 text-orange-800 ring-orange-300 dark:bg-orange-900/30 dark:text-orange-200 dark:ring-orange-700",
    },
  },
});
const activityLabel: Record<ActivityType, string> = {
  TANAM: "Tanam",
  PUPUK: "Pupuk",
  SEMPROT: "Semprot",
  PANEN: "Panen",
};
export function ActivityBadge({ activity }: { activity: ActivityType }) {
  return <span className={activityBadgeVariants({ activity })}>{activityLabel[activity]}</span>;
}

const riskBadgeVariants = cva(base, {
  variants: {
    risk: {
      RENDAH:
        "bg-sky-50 text-sky-800 ring-sky-300 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-700",
      SEDANG:
        "bg-amber-50 text-amber-800 ring-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700",
      TINGGI:
        "bg-red-50 text-red-700 ring-red-300 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-700",
    },
  },
});
const riskLabel: Record<RiskLevel, string> = {
  RENDAH: "Risiko Rendah",
  SEDANG: "Risiko Sedang",
  TINGGI: "Risiko Tinggi",
};
export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <span className={riskBadgeVariants({ risk })}>{riskLabel[risk]}</span>;
}

const statusBadgeVariants = cva(base, {
  variants: {
    status: {
      MENUNGGU:
        "bg-stone-100 text-stone-700 ring-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-600",
      TERVALIDASI:
        "bg-brand-50 text-brand-700 ring-brand-300 dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-700",
      DITOLAK:
        "bg-red-50 text-red-700 ring-red-300 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-700",
    },
  },
});
const statusLabel: Record<ValidationStatus, string> = {
  MENUNGGU: "Menunggu",
  TERVALIDASI: "Tervalidasi",
  DITOLAK: "Ditolak",
};
export function StatusBadge({ status }: { status: ValidationStatus }) {
  return <span className={statusBadgeVariants({ status })}>{statusLabel[status]}</span>;
}

const roleBadgeVariants = cva(base, {
  variants: {
    role: {
      petani:
        "bg-brand-50 text-brand-700 ring-brand-300 dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-700",
      penyuluh:
        "bg-sky-50 text-sky-800 ring-sky-300 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-700",
      admin:
        "bg-purple-50 text-purple-800 ring-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:ring-purple-700",
    },
  },
});
const roleLabel = { petani: "Petani", penyuluh: "Penyuluh", admin: "Admin" } as const;
export function RoleBadge({ role }: { role: "petani" | "penyuluh" | "admin" }) {
  return <span className={roleBadgeVariants({ role })}>{roleLabel[role]}</span>;
}
