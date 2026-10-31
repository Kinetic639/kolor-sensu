import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
vi.mock("@/features/booking/load-wizard", () => ({ loadWizard: vi.fn() }));
import { loadWizard } from "@/features/booking/load-wizard";
const load = vi.mocked(loadWizard);
const request = () =>
  new Request(
    "http://localhost/api/booking/preview?usluga=konsultacja&specjalista=anna-nowak&forma=online",
  );
beforeEach(() => vi.resetAllMocks());
describe("homepage booking preview", () => {
  it("opens the soonest bookable week when the current week is empty", async () => {
    const empty = {
      days: [],
      nothingFree: {
        kind: "later",
        href: "/umow-wizyte?tydzien=2026-11-02",
        label: "2 listopada",
      },
    };
    const available = {
      days: [
        {
          date: "2026-11-02",
          slots: [
            { time: "09:00", href: "/umow-wizyte?termin=2026-11-02T09:00" },
          ],
        },
      ],
    };
    load.mockResolvedValueOnce({
      view: { panel: { kind: "slots", picker: empty } },
    } as unknown as Awaited<ReturnType<typeof loadWizard>>);
    load.mockResolvedValueOnce({
      view: { panel: { kind: "slots", picker: available } },
    } as unknown as Awaited<ReturnType<typeof loadWizard>>);
    const response = await GET(new Request(`${request().url}&najblizszy=1`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ picker: available });
    expect(load).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ tydzien: "2026-11-02", termin: null }),
    );
  });

  it("keeps a manually selected empty week instead of jumping forward", async () => {
    const picker = {
      days: [],
      nothingFree: { kind: "later", href: "/umow-wizyte?tydzien=2026-11-02" },
    };
    load.mockResolvedValue({
      view: { panel: { kind: "slots", picker } },
    } as unknown as Awaited<ReturnType<typeof loadWizard>>);
    const response = await GET(
      new Request(`${request().url}&tydzien=2026-10-26`),
    );
    expect(response.status).toBe(200);
    expect(load).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ picker });
  });
  it("returns the existing wizard's live times with caching disabled", async () => {
    const picker = {
      days: [],
      weekLabel: "14–20 stycznia",
      nothingFree: { kind: "none", days: 60, contactHref: "/kontakt" },
    };
    load.mockResolvedValue({
      view: { panel: { kind: "slots", picker } },
    } as unknown as Awaited<ReturnType<typeof loadWizard>>);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ picker });
    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        specjalista: "anna-nowak",
        usluga: "konsultacja",
        forma: "online",
        termin: null,
      }),
    );
  });
  it("does not query availability without a complete selection", async () => {
    expect(
      (await GET(new Request("http://localhost/api/booking/preview"))).status,
    ).toBe(400);
    expect(load).not.toHaveBeenCalled();
  });
  it("does not expose times for an incompatible selection", async () => {
    load.mockResolvedValue({ view: { panel: { kind: "choices" } } } as Awaited<
      ReturnType<typeof loadWizard>
    >);
    expect((await GET(request())).status).toBe(400);
  });
  it("does not present a failed availability read as a fully booked week", async () => {
    load.mockResolvedValue({
      view: {
        panel: {
          kind: "slots",
          picker: { days: [], weekLabel: "14–20 stycznia" },
        },
      },
    } as unknown as Awaited<ReturnType<typeof loadWizard>>);
    expect((await GET(request())).status).toBe(503);
  });
  it("reports booking being switched off", async () => {
    load.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(503);
  });
});
