import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompactBookingCalendar } from "./compact-booking-calendar";
import { compactBookingSample } from "./compact-booking-samples";
describe("CompactBookingCalendar", () => {
  it("shows the specialist's service descriptions and prices, then chooses the service in the retained calendar", () => {
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
    expect(screen.getByRole("tabpanel", { name: "Usługi" })).toBeVisible();
    expect(screen.getByText("210 zł")).toBeVisible();
    expect(
      screen.getByText(compactBookingSample.services[0]!.description!),
    ).toBeVisible();
    expect(
      screen.queryByRole("combobox", { name: "Wybierz usługę" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Sprawdź terminy: Spotkanie wspierające →",
      }),
    );
    expect(change).toHaveBeenCalledWith({ service: "wsparcie" });
    expect(screen.getByRole("tab", { name: "Terminarz" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
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
  it("changes the selected service and visit mode while retaining its calendar slot", () => {
    const change = vi.fn();
    render(
      <CompactBookingCalendar
        {...compactBookingSample}
        onChange={change}
        calendar={<p>Live calendar</p>}
      />,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Wybierz usługę" }), {
      target: { value: "wsparcie" },
    });
    expect(change).toHaveBeenCalledWith({ service: "wsparcie" });
    fireEvent.click(screen.getByRole("button", { name: "Online" }));
    expect(change).toHaveBeenCalledWith({ mode: "online" });
    expect(screen.getByText("Live calendar")).toBeInTheDocument();
  });
});
