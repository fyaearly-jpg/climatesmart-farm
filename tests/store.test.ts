import { beforeEach, describe, expect, it } from "vitest";
import { useUIStore } from "@/store/useUIStore";

describe("useUIStore (Client UI State — Zustand)", () => {
  beforeEach(() => {
    useUIStore.setState({
      isSidebarCollapsed: false,
      selectedActivityFilter: "SEMUA",
      isFilterDrawerOpen: false,
      themeMode: "light",
    });
  });

  it("state awal sesuai default", () => {
    const s = useUIStore.getState();
    expect(s.isSidebarCollapsed).toBe(false);
    expect(s.selectedActivityFilter).toBe("SEMUA");
    expect(s.isFilterDrawerOpen).toBe(false);
    expect(s.themeMode).toBe("light");
  });

  it("toggleSidebar membalik status sidebar", () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().isSidebarCollapsed).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().isSidebarCollapsed).toBe(false);
  });

  it("setSelectedActivityFilter mengganti filter aktivitas", () => {
    useUIStore.getState().setSelectedActivityFilter("PUPUK");
    expect(useUIStore.getState().selectedActivityFilter).toBe("PUPUK");
  });

  it("toggleFilterDrawer membalik status drawer", () => {
    useUIStore.getState().toggleFilterDrawer();
    expect(useUIStore.getState().isFilterDrawerOpen).toBe(true);
  });

  it("toggleTheme bergantian light <-> dark", () => {
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().themeMode).toBe("dark");
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().themeMode).toBe("light");
  });
});
