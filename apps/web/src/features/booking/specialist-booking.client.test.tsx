// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpecialistBookingClient } from "./specialist-booking.client";
import type { SlotPickerProps } from "@repo/ui/booking";

afterEach(() => vi.unstubAllGlobals());
const picker = (time: string): SlotPickerProps => ({
  weekLabel: "7–13 stycznia",
  days: [
    {
      date: "2030-01-07",
      weekday: "Pon.",
      label: "7 stycznia",
      fullLabel: "poniedziałek, 7 stycznia",
      slots: [{ time, href: `/umow-wizyte?termin=2030-01-07T${time}` }],
    },
  ],
});
describe("SpecialistBookingClient", () => {
  it("ignores a stale response after changing the service and its supported mode", async () => {
    const requests: {
      url: string;
      signal: AbortSignal;
      resolve: (response: Response) => void;
    }[] = [];
    vi.stubGlobal("IntersectionObserver", undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (url: string, init: RequestInit) =>
          new Promise<Response>((resolve) =>
            requests.push({ url, signal: init.signal as AbortSignal, resolve }),
          ),
      ),
    );
    render(
      <SpecialistBookingClient
        today="2030-01-07"
        lastDay="2030-03-08"
        specialistSlug="anna-nowak"
        specialistName="Anna Nowak"
        services={[
          {
            slug: "konsultacja",
            name: "Konsultacja",
            detail: "50 min · 200 zł",
            modes: ["stacjonarnie"],
          },
          {
            slug: "online",
            name: "Spotkanie online",
            detail: "50 min · 180 zł",
            modes: ["online"],
          },
        ]}
        locations={[{ slug: "centrum", name: "Centrum" }]}
      />,
    );
    await waitFor(() => expect(requests).toHaveLength(1));
    fireEvent.change(screen.getByRole("combobox", { name: "Wybierz usługę" }), {
      target: { value: "online" },
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0]!.signal.aborted).toBe(true);
    expect(requests[1]!.url).toContain("forma=online");
    expect(requests[1]!.url).not.toContain("lokalizacja=");
    await act(async () =>
      requests[1]!.resolve(Response.json({ picker: picker("14:00") })),
    );
    expect(
      await screen.findByRole("button", { name: /14:00, wolny termin/ }),
    ).toBeInTheDocument();
    await act(async () =>
      requests[0]!.resolve(Response.json({ picker: picker("09:00") })),
    );
    expect(
      screen.queryByRole("button", { name: /09:00, wolny termin/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /14:00, wolny termin/ }),
    ).toBeInTheDocument();
  });
});
