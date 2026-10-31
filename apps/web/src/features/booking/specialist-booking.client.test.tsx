import { getAvailabilityQueryClient } from "./availability-query";
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpecialistBookingClient } from "./specialist-booking.client";

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
  ],
  locations: [{ slug: "centrum", name: "Centrum" }],
};
beforeEach(() => {
  getAvailabilityQueryClient().clear();
  vi.stubGlobal("IntersectionObserver", undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        picker: {
          weekLabel: "7–13 stycznia",
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
  getAvailabilityQueryClient().clear();
  cleanup();
  vi.unstubAllGlobals();
});
async function chooseTime() {
  fireEvent.click(
    await screen.findByRole("button", { name: /09:00, wolny termin/ }),
  );
}
describe("specialist appointment selection", () => {
  it("keeps other compatible services enabled after starting with one service", async () => {
    const alternative = {
      service: "inna",
      mode: "online",
      location: "",
      href: "/umow-wizyte?usluga=inna&forma=online&termin=2030-01-07T09:00",
    };
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
                slots: [
                  {
                    time: "09:00",
                    href: options[0]!.href,
                    options: [...options, alternative],
                  },
                ],
              },
            ],
          },
        }),
      ),
    );
    render(
      <SpecialistBookingClient
        {...props}
        services={[
          ...props.services,
          { ...props.services[0]!, slug: "inna", name: "Inna konsultacja" },
        ]}
      />,
    );
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
    expect(
      screen.getByRole("button", { name: "Wybierz: Dłuższa rozmowa" }),
    ).toBeDisabled();
    fireEvent.click(other);
    expect(
      screen.getByRole("link", { name: "Przejdź do rezerwacji" }),
    ).toHaveAttribute("href", alternative.href);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("starts with only a calendar, then filters services for the chosen hour and requires a form before booking", async () => {
    render(<SpecialistBookingClient {...props} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Przejdź do rezerwacji" }),
    ).not.toBeInTheDocument();
    await chooseTime();
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
    expect(
      screen.queryByRole("link", { name: "Przejdź do rezerwacji" }),
    ).not.toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Forma i miejsce spotkania" }),
      { target: { value: options[1]!.href } },
    );
    expect(
      screen.getByRole("link", { name: "Przejdź do rezerwacji" }),
    ).toHaveAttribute("href", options[1]!.href);
    fireEvent.click(screen.getByRole("button", { name: "Zmień termin" }));
    expect(screen.getByRole("tab", { name: "Terminarz" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.queryByRole("link", { name: "Przejdź do rezerwacji" }),
    ).not.toBeInTheDocument();
  });
  it("supports service first, then opens the calendar for that service and finishes with the chosen time", async () => {
    render(<SpecialistBookingClient {...props} />);
    await screen.findByRole("button", { name: /09:00, wolny termin/ });
    fireEvent.click(screen.getByRole("tab", { name: "Usługi" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Wybierz: Konsultacja" }),
    );
    expect(screen.getByRole("tab", { name: "Terminarz" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await chooseTime();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Forma i miejsce spotkania" }),
      { target: { value: options[0]!.href } },
    );
    expect(
      screen.getByRole("link", { name: "Przejdź do rezerwacji" }),
    ).toHaveAttribute("href", options[0]!.href);
  });
});
