import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSpecialistPreview } from "./load-specialist-preview";
import type { BookingParams } from "./search-params";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: () => ({ rpc }),
}));
const params: BookingParams = {
  specjalista: "anna",
  usluga: null,
  forma: null,
  lokalizacja: null,
  tydzien: "2030-01-07",
  termin: null,
  uwaga: null,
};
const payload = {
  timeZone: "Europe/Warsaw",
  today: "2030-01-07",
  lastDay: "2030-03-08",
  from: "2030-01-07",
  to: "2030-01-13",
  slots: [
    {
      startsAt: "2030-01-07T08:00:00Z",
      options: [
        { service: "konsultacja", mode: "online", location: "" },
        { service: "rozmowa", mode: "stacjonarnie", location: "centrum" },
      ],
    },
  ],
};
beforeEach(() => {
  vi.resetAllMocks();
  rpc.mockResolvedValue({ data: payload, error: null });
});
describe("batched specialist availability", () => {
  it("reads all offers in exactly one RPC and builds complete booking links in the centre's time zone", async () => {
    const result = await loadSpecialistPreview(params, true);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "specialist_availability",
      expect.objectContaining({ p_specialist_slug: "anna", p_nearest: true }),
    );
    expect(result.picker.days).toHaveLength(7);
    const slot = result.picker.days[0]!.slots[0]!;
    expect(slot.time).toBe("09:00");
    expect(slot.options).toHaveLength(2);
    const url = new URL(slot.options![1]!.href, "http://booking.local");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      usluga: "rozmowa",
      forma: "stacjonarnie",
      lokalizacja: "centrum",
      termin: "2030-01-07T09:00",
      specjalista: "anna",
    });
  });
  it("reads the whole month in one RPC and keeps a service filter", async () => {
    await loadSpecialistPreview(
      { ...params, usluga: "rozmowa" },
      false,
      "2030-02-01",
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "specialist_availability",
      expect.objectContaining({
        p_from: "2030-02-01",
        p_to: "2030-02-28",
        p_service_slug: "rozmowa",
      }),
    );
  });
  it("fails closed on database errors and malformed responses", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error("Unavailable") });
    await expect(loadSpecialistPreview(params, true)).rejects.toThrow(
      "Unavailable",
    );
    rpc.mockResolvedValueOnce({ data: { slots: [] }, error: null });
    await expect(loadSpecialistPreview(params, true)).rejects.toThrow();
  });
});
