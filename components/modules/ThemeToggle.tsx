// components/modules/ThemeToggle.tsx — Client leaf (Zustand themeMode)
"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";

export function ThemeToggle() {
  const themeMode = useUIStore((s) => s.themeMode);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={themeMode === "dark"}
      aria-label="Ganti mode tema terang/gelap"
      className="flex h-9 items-center gap-2 rounded-full border border-stone-300 bg-white/80 px-3 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white"
    >
      {themeMode === "light" ? "🌙 Gelap" : "☀️ Terang"}
    </button>
  );
}
