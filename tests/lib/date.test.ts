import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatSisaWaktu,
  formatTanggal,
  hariIniJakarta,
  RENTANG_SIMULASI_HARI,
  tambahHari,
} from "@/lib/date";

describe("lib/date", () => {
  afterEach(() => vi.useRealTimers());

  it("hariIniJakarta memakai zona Asia/Jakarta, bukan UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T20:00:00Z")); // 03.00 WIB tanggal 4
    expect(hariIniJakarta()).toBe("2026-11-04");
    vi.setSystemTime(new Date("2026-11-03T16:59:00Z")); // 23.59 WIB tanggal 3
    expect(hariIniJakarta()).toBe("2026-11-03");
  });

  it("tambahHari melewati batas bulan, tahun, dan kabisat", () => {
    expect(tambahHari("2026-11-30", 1)).toBe("2026-12-01");
    expect(tambahHari("2026-12-31", 1)).toBe("2027-01-01");
    expect(tambahHari("2028-02-28", 1)).toBe("2028-02-29");
    expect(tambahHari("2026-11-03", RENTANG_SIMULASI_HARI)).toBe("2026-11-12");
    expect(tambahHari("2026-11-03", -3)).toBe("2026-10-31");
  });

  it("formatTanggal dalam bahasa Indonesia", () => {
    expect(formatTanggal("2026-11-03")).toBe("3 November 2026");
  });

  it("formatSisaWaktu", () => {
    expect(formatSisaWaktu(312)).toBe("5 j 12 m");
    expect(formatSisaWaktu(45)).toBe("45 m");
    expect(formatSisaWaktu(-10)).toBe("0 m");
    expect(formatSisaWaktu(0)).toBe("0 m");
  });
});
