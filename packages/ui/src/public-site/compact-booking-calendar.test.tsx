import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompactBookingCalendar } from "./compact-booking-calendar";
import { compactBookingSample } from "./compact-booking-samples";
describe("CompactBookingCalendar", () => {
  it("expands full service descriptions while keeping service selection in the retained calendar", () => {
    const change = vi.fn();
    render(
      <CompactBookingCalendar
        {...compactBookingSample}
        onChange={change}
        calendar={
          <input aria-label="Zachowany wybór dnia" defaultValue="2 listopada" />
        }
      />,
    );
    const calendar = screen.getByRole("textbox", {
      name: "Zachowany wybór dnia",
    });
    fireEvent.click(screen.getByRole("tab", { name: "Usługi" }));
    expect(
      screen.getByRole("region", { name: "Umów wizytę — Anna Nowak" }),
    ).toHaveAttribute("data-active-tab", "services");
    expect(screen.getByRole("tabpanel", { name: "Usługi" })).toBeVisible();
    expect(screen.getByText("210 zł")).toBeVisible();
    expect(
      screen.queryByText(compactBookingSample.services[0]!.description!),
    ).not.toBeInTheDocument();
    const expand = screen.getByRole("button", {
      name: "Konsultacja psychologiczna",
    });
    fireEvent.click(expand);
    expect(expand).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(compactBookingSample.services[0]!.description!),
    ).toBeVisible();
    fireEvent.click(expand);
    expect(
      screen.queryByText(compactBookingSample.services[0]!.description!),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Wybierz usługę" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Wybierz: Spotkanie wspierające",
      }),
    );
    expect(change).toHaveBeenCalledWith({ service: "wsparcie" });
    expect(screen.getByRole("tab", { name: "Terminarz" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("region", { name: "Umów wizytę — Anna Nowak" }),
    ).toHaveAttribute("data-active-tab", "calendar");
    expect(screen.getByRole("textbox", { name: "Zachowany wybór dnia" })).toBe(
      calendar,
    );
    expect(calendar).toHaveValue("2 listopada");
  });
  it("switches tabs with arrow keys and keeps a single tab stop", () => {
    render(
      <CompactBookingCalendar
        {...compactBookingSample}
        onChange={vi.fn()}
        calendar={<p>Kalendarz</p>}
      />,
    );
    const calendarTab = screen.getByRole("tab", { name: "Terminarz" });
    fireEvent.keyDown(calendarTab, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Usługi" })).toHaveFocus();
    expect(calendarTab).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Usługi" }), {
      key: "Home",
    });
    expect(calendarTab).toHaveFocus();
    expect(calendarTab).toHaveAttribute("aria-selected", "true");
  });
  it("keeps the calendar free of service controls and disables incompatible offers", () => {
    render(
      <CompactBookingCalendar
        {...compactBookingSample}
        hasSelectedTime
        availableServiceSlugs={["konsultacja"]}
        onChange={vi.fn()}
        calendar={<p>Live calendar</p>}
      />,
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Usługi" }));
    expect(
      screen.getByRole("button", { name: "Wybierz: Spotkanie wspierające" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Wybierz: Konsultacja psychologiczna",
      }),
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Konsultacja psychologiczna" }),
    );
    expect(screen.getByText("Stacjonarnie / Online")).toBeVisible();
  });
});
