// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { focusManager } from "@tanstack/react-query";
import { getAvailabilityQueryClient } from "./availability-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvailabilityCalendarClient } from "./availability-calendar.client";

beforeEach(() => {
  getAvailabilityQueryClient().clear();
  focusManager.setFocused(true);
});
afterEach(() => {
  getAvailabilityQueryClient().clear();
  cleanup();
  vi.unstubAllGlobals();
});
const nextDay = {
  date: "2026-11-02",
  weekday: "Pon.",
  label: "2 listopada",
  fullLabel: "poniedziałek, 2 listopada",
  slots: [{ time: "09:00", href: "/umow-wizyte?termin=2026-11-02T09:00" }],
};
function mockAvailability() {
  const fetch = vi.fn(async (url: string) =>
    Response.json({
      picker: {
        days:
          url.includes("najblizszy=1") || url.includes("tydzien=2026-11-02")
            ? [nextDay]
            : [],
      },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
const props = {
  query: "usluga=konsultacja&specjalista=anna&forma=online",
  today: "2026-10-31",
  lastDay: "2026-11-30",
};

describe("initial availability calendar period", () => {
  it("shares an in-flight request between calendar instances", async () => {
    const fetch = mockAvailability();
    render(
      <>
        <AvailabilityCalendarClient {...props} />
        <AvailabilityCalendarClient {...props} />
      </>,
    );
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: /09:00, wolny termin/ }),
      ).toHaveLength(2),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("loads a whole month once and reuses visited views without extra requests", async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        picker: { days: [nextDay] },
        from: "2026-11-01",
        to: "2026-11-30",
      }),
    );
    vi.stubGlobal("fetch", fetch);
    render(
      <AvailabilityCalendarClient
        {...props}
        endpoint="/api/booking/specialist-preview"
        rangeRequests
      />,
    );
    await screen.findByRole("button", { name: /09:00, wolny termin/ });
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Miesiąc" }));
    await screen.findByRole("button", { name: /09:00, wolny termin/ });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("miesiac=2026-11-01"),
      expect.anything(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Tydzień" }));
    await screen.findByRole("button", { name: /09:00, wolny termin/ });
    fireEvent.click(screen.getByRole("button", { name: "Miesiąc" }));
    await screen.findByRole("button", { name: /09:00, wolny termin/ });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("ignores a response from the previous specialist", async () => {
    let resolveOld!: (response: Response) => void;
    const fetch = vi.fn((url: string) =>
      url.includes("specjalista=anna")
        ? new Promise<Response>((resolve) => {
            resolveOld = resolve;
          })
        : Promise.resolve(Response.json({ picker: { days: [nextDay] } })),
    );
    vi.stubGlobal("fetch", fetch);
    const { rerender } = render(<AvailabilityCalendarClient {...props} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    rerender(<AvailabilityCalendarClient {...props} query="specjalista=jan" />);
    await screen.findByRole("button", { name: /09:00, wolny termin/ });
    resolveOld(
      Response.json({
        picker: {
          days: [
            { ...nextDay, slots: [{ time: "15:00", href: "/old-specialist" }] },
          ],
        },
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /15:00, wolny termin/ }),
      ).not.toBeInTheDocument(),
    );
  });

  it("opens November and its first free workweek on the last Saturday of October", async () => {
    mockAvailability();
    render(<AvailabilityCalendarClient {...props} />);
    await screen.findByRole("button", { name: /09:00, wolny termin/ });
    expect(
      screen.getByRole("heading", { level: 4, name: "2 lis – 6 lis 2026" }),
    ).toHaveTextContent("2 lis – 6 lis 2026");
    fireEvent.click(screen.getByRole("button", { name: "Miesiąc" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(
        "listopad 2026",
      ),
    );
    expect(
      await screen.findByRole("button", { name: /09:00, wolny termin/ }),
    ).toBeInTheDocument();
  });

  it("does not override a manually chosen empty period or reset it when refreshed", async () => {
    const fetch = mockAvailability();
    render(<AvailabilityCalendarClient {...props} />);
    await screen.findByRole("button", { name: /09:00, wolny termin/ });
    fireEvent.click(screen.getByRole("button", { name: "Poprzedni tydzień" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(
        "26 paź – 30 paź 2026",
      ),
    );
    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        expect.stringContaining("tydzien=2026-10-26"),
        expect.anything(),
      ),
    );
    await getAvailabilityQueryClient().invalidateQueries({
      queryKey: ["availability"],
      refetchType: "none",
    });
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await waitFor(() =>
      expect(
        fetch.mock.calls.filter(([url]) => url.includes("tydzien=2026-10-26")),
      ).toHaveLength(2),
    );
    expect(
      fetch.mock.calls.filter(([url]) => url.includes("najblizszy=1")),
    ).toHaveLength(1);
  });

  it("stops at an empty booking horizon and allows retrying a failed initial read", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(
        Response.json({ picker: { days: [], nothingFree: { kind: "none" } } }),
      );
    vi.stubGlobal("fetch", fetch);
    render(<AvailabilityCalendarClient {...props} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Spróbuj ponownie" }),
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Spróbuj ponownie" }),
      ).not.toBeInTheDocument(),
    );
  });
});
