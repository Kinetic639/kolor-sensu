// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAvailabilityQueryClient } from "./availability-query";
import { SpecialistBookingClient } from "./specialist-booking.client";
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
const options = [
  {
    service: "konsultacja",
    mode: "online",
    location: "",
    href: "/umow-wizyte?usluga=konsultacja&forma=online&termin=2030-01-07T09:00",
  },
  {
    service: "konsultacja",
    mode: "stacjonarnie",
    location: "centrum",
    href: "/umow-wizyte?usluga=konsultacja&forma=stacjonarnie&lokalizacja=centrum&termin=2030-01-07T09:00",
  },
  {
    service: "inna",
    mode: "online",
    location: "",
    href: "/umow-wizyte?usluga=inna&forma=online&termin=2030-01-07T09:00",
  },
];
const props = {
  today: "2030-01-07",
  lastDay: "2030-03-08",
  specialistSlug: "anna-nowak",
  specialistName: "Anna Nowak",
  services: [
    {
      slug: "konsultacja",
      name: "Konsultacja",
      detail: "50 min · 200 zł",
      description: "Pełny opis konsultacji",
      modes: ["stacjonarnie", "online"] as ("online" | "stacjonarnie")[],
    },
    {
      slug: "dluga",
      name: "Dłuższa rozmowa",
      detail: "90 min · 300 zł",
      modes: ["online"] as ("online" | "stacjonarnie")[],
    },
    {
      slug: "inna",
      name: "Inna konsultacja",
      detail: "50 min · 180 zł",
      modes: ["online"] as ("online" | "stacjonarnie")[],
    },
  ],
  locations: [{ slug: "centrum", name: "Centrum" }],
};
beforeEach(() => {
  navigation.push.mockClear();
  getAvailabilityQueryClient().clear();
  vi.stubGlobal("IntersectionObserver", undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        picker: {
          days: [
            {
              date: "2030-01-07",
              weekday: "Pon.",
              label: "7 stycznia",
              fullLabel: "poniedziałek, 7 stycznia",
              slots: [{ time: "09:00", href: options[0]!.href, options }],
            },
          ],
        },
      }),
    ),
  );
});
afterEach(() => {
  cleanup();
  getAvailabilityQueryClient().clear();
  vi.unstubAllGlobals();
});
function expectHandoff(service: string) {
  const href = navigation.push.mock.calls.at(-1)![0] as string;
  const url = new URL(href, "http://booking.local");
  expect(url.pathname).toBe("/umow-wizyte");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    specjalista: "anna-nowak",
    usluga: service,
    termin: "2030-01-07T09:00",
    dalej: "auto",
  });
}
async function chooseTime() {
  fireEvent.click(
    await screen.findByRole("button", { name: /09:00, wolny termin/ }),
  );
}
describe("specialist panel hands incomplete appointments to the wizard", () => {
  it("supports time first and opens the wizard after choosing a compatible service without asking for a form", async () => {
    render(<SpecialistBookingClient {...props} />);
    await chooseTime();
    expect(navigation.push).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "Usługi" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Wybierz: Dłuższa rozmowa" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Wybierz: Konsultacja" }),
    );
    expectHandoff("konsultacja");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
  it("supports service first and opens the wizard after choosing a time", async () => {
    render(<SpecialistBookingClient {...props} />);
    await screen.findByRole("button", { name: /09:00, wolny termin/ });
    fireEvent.click(screen.getByRole("tab", { name: "Usługi" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Wybierz: Konsultacja" }),
    );
    expect(navigation.push).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "Terminarz" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await chooseTime();
    expectHandoff("konsultacja");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("preserves other compatible services when the calendar was filtered by a service", async () => {
    render(<SpecialistBookingClient {...props} />);
    await screen.findByRole("button", { name: /09:00, wolny termin/ });
    fireEvent.click(screen.getByRole("tab", { name: "Usługi" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Wybierz: Konsultacja" }),
    );
    await chooseTime();
    fireEvent.click(screen.getByRole("tab", { name: "Usługi" }));
    const other = screen.getByRole("button", {
      name: "Wybierz: Inna konsultacja",
    });
    expect(other).toBeEnabled();
    fireEvent.click(other);
    expectHandoff("inna");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
