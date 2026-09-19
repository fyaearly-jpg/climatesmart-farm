import { describe, expect, it } from "vitest";
import {
  FarmRecommendationSchema,
  LoginSchema,
  PlotRegistrationSchema,
  PublicUserSchema,
  RegisterSchema,
  RoleEnum,
  SensorSampleSchema,
  WeatherSampleSchema,
} from "@/lib/schemas";

const validPlot = {
  plotName: "Sawah Blok A",
  commodity: "Padi",
  areaHectare: "2.5",
  activity: "TANAM",
  scheduledDate: "2026-09-25",
};

describe("PlotRegistrationSchema", () => {
  it("menerima data valid dan mengonversi luas lahan ke number", () => {
    const result = PlotRegistrationSchema.safeParse(validPlot);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.areaHectare).toBe(2.5);
  });

  it("menolak nama lahan terlalu pendek", () => {
    const result = PlotRegistrationSchema.safeParse({ ...validPlot, plotName: "ab" });
    expect(result.success).toBe(false);
  });

  it("menolak luas lahan nol, negatif, di atas 500, atau bukan angka", () => {
    for (const area of ["0", "-1", "501", "abc"]) {
      expect(PlotRegistrationSchema.safeParse({ ...validPlot, areaHectare: area }).success).toBe(
        false,
      );
    }
  });

  it("menolak jenis aktivitas di luar enum", () => {
    expect(PlotRegistrationSchema.safeParse({ ...validPlot, activity: "TIDUR" }).success).toBe(
      false,
    );
  });

  it("menolak tanggal yang tidak valid", () => {
    const result = PlotRegistrationSchema.safeParse({ ...validPlot, scheduledDate: "kemarin" });
    expect(result.success).toBe(false);
  });
});

describe("RegisterSchema & LoginSchema", () => {
  const valid = {
    name: "Budi Santoso",
    email: "budi@contoh.id",
    password: "rahasia123",
    role: "petani",
  };

  it("menerima pendaftaran valid", () => {
    expect(RegisterSchema.safeParse(valid).success).toBe(true);
  });

  it("menolak kata sandi tanpa angka atau kurang dari 8 karakter", () => {
    expect(RegisterSchema.safeParse({ ...valid, password: "tanpaangka" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...valid, password: "a1" }).success).toBe(false);
  });

  it("menolak email tidak valid dan role tidak dikenal", () => {
    expect(RegisterSchema.safeParse({ ...valid, email: "bukan-email" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...valid, role: "superadmin" }).success).toBe(false);
  });

  it("login memerlukan email valid dan kata sandi terisi", () => {
    expect(LoginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(LoginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(LoginSchema.safeParse({ email: "salah", password: "x" }).success).toBe(false);
  });

  it("RoleEnum hanya berisi tiga peran", () => {
    expect(RoleEnum.options).toEqual(["petani", "penyuluh", "admin"]);
  });
});

describe("skema data domain", () => {
  it("FarmRecommendationSchema memberi status default MENUNGGU", () => {
    const parsed = FarmRecommendationSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      plotName: "A",
      commodity: "B",
      activity: "PANEN",
      riskLevel: "RENDAH",
      scheduledDate: "2026-09-25",
      createdAt: "2026-09-01T00:00:00.000Z",
    });
    expect(parsed.status).toBe("MENUNGGU");
  });

  it("WeatherSampleSchema & SensorSampleSchema memvalidasi enum", () => {
    expect(
      WeatherSampleSchema.safeParse({
        suhu: 28,
        kelembapanUdara: 70,
        kondisi: "Cerah",
        risiko: "RENDAH",
      }).success,
    ).toBe(true);
    expect(
      WeatherSampleSchema.safeParse({
        suhu: 28,
        kelembapanUdara: 70,
        kondisi: "Badai",
        risiko: "RENDAH",
      }).success,
    ).toBe(false);
    expect(
      SensorSampleSchema.safeParse({ kelembapanTanah: 50, suhuTanah: 26, statusIrigasi: "Cukup" })
        .success,
    ).toBe(true);
  });

  it("PublicUserSchema tidak menerima email tidak valid", () => {
    expect(
      PublicUserSchema.safeParse({
        id: "11111111-1111-4111-8111-111111111111",
        name: "X",
        email: "salah",
        role: "admin",
        createdAt: "2026-09-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});
