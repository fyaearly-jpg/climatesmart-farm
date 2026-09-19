// components/ui/AsyncUI.tsx — presentational, Tailwind v4
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: daftar dekoratif statis, urutan tidak pernah berubah, tanpa state per-item
        <div key={i} className="skeleton-line" style={{ width: `${85 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
    >
      <p className="text-sm">{message}</p>
      {onRetry && (
        <button
          type="button"
          className="mt-2 rounded-full border border-red-300 px-3 py-1 text-xs font-semibold hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/40"
          onClick={onRetry}
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400"
    >
      {message}
    </div>
  );
}
