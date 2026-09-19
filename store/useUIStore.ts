// store/useUIStore.ts
//
// Client UI State (Zustand) — Modul 7, diadaptasi untuk arsitektur Next.js
// App Router. Berbeda dari versi Modul 5/7 (Vite SPA) yang menyimpan
// `activeTab` di Zustand, di sini navigasi antar modul memakai routing
// Next.js sungguhan (<Link>, app/dashboard/*/page.tsx) — URL browser
// itulah "source of truth" tab aktif, sehingga TIDAK perlu direplikasi ke
// Zustand (menghindari dua sumber kebenaran untuk hal yang sama).
// Empat atribut di bawah ini tetap murni Client UI State: tidak satupun
// menyimpan data hasil fetch API.
"use client";

import { create } from "zustand";
import type { ActivityType } from "@/lib/schemas";

export type ThemeMode = "light" | "dark";
export type ActivityFilter = ActivityType | "SEMUA";

interface UIState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  selectedActivityFilter: ActivityFilter;
  setSelectedActivityFilter: (filter: ActivityFilter) => void;

  isFilterDrawerOpen: boolean;
  toggleFilterDrawer: () => void;

  themeMode: ThemeMode;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),

  selectedActivityFilter: "SEMUA",
  setSelectedActivityFilter: (filter) => set({ selectedActivityFilter: filter }),

  isFilterDrawerOpen: false,
  toggleFilterDrawer: () => set((s) => ({ isFilterDrawerOpen: !s.isFilterDrawerOpen })),

  themeMode: "light",
  toggleTheme: () => set((s) => ({ themeMode: s.themeMode === "light" ? "dark" : "light" })),
}));
