// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useCreateRecommendationMutation,
  useRecommendationsQuery,
  useValidateRecommendationMutation,
} from "@/hooks/useRecommendationsQuery";
import { useWeatherQuery } from "@/hooks/useWeatherQuery";
import { createClient, createWrapper, jsonResponse, sampleRecommendations } from "../helpers";

const fetchMock = vi.fn();

// TanStack Query hanya me-render ulang untuk properti yang DIBACA hook (tracked props),
// jadi hook dibungkus agar semua properti yang diuji dibaca saat render.
function readQuery<T>(q: {
  data: T;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}) {
  return { data: q.data, isError: q.isError, error: q.error, refetch: q.refetch };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const weather = { suhu: 29, kelembapanUdara: 70, kondisi: "Cerah", risiko: "RENDAH" } as const;

describe("useRecommendationsQuery", () => {
  it("langsung memakai initialData tanpa fetch saat mount", () => {
    const { result } = renderHook(() => readQuery(useRecommendationsQuery(sampleRecommendations)), {
      wrapper: createWrapper(),
    });
    expect(result.current.data).toHaveLength(3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refetch memanggil /api/recommendations dan memperbarui data", async () => {
    fetchMock.mockResolvedValue(jsonResponse([sampleRecommendations[0]]));
    const { result } = renderHook(() => readQuery(useRecommendationsQuery(sampleRecommendations)), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.refetch();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/recommendations");
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });

  it("refetch yang gagal menghasilkan status error dengan pesan yang jelas", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    const { result } = renderHook(() => readQuery(useRecommendationsQuery(sampleRecommendations)), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Gagal mengambil data rekomendasi dari server.");
  });
});

describe("useCreateRecommendationMutation", () => {
  const input = {
    plotName: "Lahan Uji",
    commodity: "Padi",
    areaHectare: 1,
    activity: "TANAM",
    scheduledDate: "2026-09-25",
  } as const;

  it("mengirim POST dan mengembalikan data yang dibuat", async () => {
    fetchMock.mockResolvedValue(jsonResponse(sampleRecommendations[0], 201));
    const client = createClient();
    const { result } = renderHook(() => useCreateRecommendationMutation(), {
      wrapper: createWrapper(client),
    });
    let created: unknown;
    await act(async () => {
      created = await result.current.mutateAsync(input);
    });
    expect(created).toMatchObject({ plotName: "Sawah Blok A" });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/recommendations");
    expect(init).toMatchObject({ method: "POST" });
  });

  it("memakai pesan error dari server bila ada", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Validasi gagal" }, 400));
    const { result } = renderHook(() => useCreateRecommendationMutation(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync(input).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.error?.message).toBe("Validasi gagal"));
  });

  it("memakai pesan bawaan bila respons error bukan JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>gagal</html>", { status: 500 }));
    const { result } = renderHook(() => useCreateRecommendationMutation(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync(input).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.error?.message).toBe("Gagal menyimpan data lahan."));
  });
});

describe("useValidateRecommendationMutation", () => {
  it("mengirim PATCH ke endpoint validasi dengan keputusan yang dipilih", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ...sampleRecommendations[0], status: "TERVALIDASI" }),
    );
    const { result } = renderHook(() => useValidateRecommendationMutation(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({ id: "abc", decision: "TERVALIDASI" });
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/recommendations/abc/validate");
    expect(init).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ decision: "TERVALIDASI" }),
    });
  });

  it("menampilkan pesan error dari server (404) atau pesan bawaan", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Rekomendasi tidak ditemukan." }, 404));
    const { result } = renderHook(() => useValidateRecommendationMutation(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({ id: "x", decision: "DITOLAK" }).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.error?.message).toBe("Rekomendasi tidak ditemukan."));

    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));
    await act(async () => {
      await result.current.mutateAsync({ id: "x", decision: "DITOLAK" }).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.error?.message).toBe("Gagal memproses validasi."));
  });
});

describe("useWeatherQuery", () => {
  it("memakai initialData lalu refetch mengambil /api/weather", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...weather, suhu: 33 }));
    const { result } = renderHook(() => readQuery(useWeatherQuery(weather)), {
      wrapper: createWrapper(),
    });
    expect(result.current.data.suhu).toBe(29);
    await act(async () => {
      await result.current.refetch();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/weather");
    await waitFor(() => expect(result.current.data.suhu).toBe(33));
  });

  it("melaporkan error bila server gagal", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    const { result } = renderHook(() => readQuery(useWeatherQuery(weather)), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.error?.message).toBe("Gagal memuat data cuaca."));
  });
});
