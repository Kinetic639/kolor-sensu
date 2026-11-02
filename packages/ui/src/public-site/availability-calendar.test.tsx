import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvailabilityCalendar } from "./availability-calendar";
import { availabilityCalendarSample } from "./compact-booking-samples";
const callbacks = () => ({
  onViewChange: vi.fn(),
  onNavigate: vi.fn(),
  onRetry: vi.fn(),
});
describe("AvailabilityCalendar", () => {
  it("shows five working days and hands the selected time to the existing booking flow", () => {
    render(
      <AvailabilityCalendar {...availabilityCalendarSample} {...callbacks()} />,
    );
    expect(screen.queryByText("Sob.")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: /Pon. 7 stycznia, 09:00, wolny termin/,
      }),
    );
    expect(
      screen.getByRole("link", { name: "Przejdź do rezerwacji" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("termin=2030-01-07T09:00"),
    );
  });
  it("keeps month navigation and week navigation controlled", () => {
    const handlers = callbacks();
    render(
      <AvailabilityCalendar {...availabilityCalendarSample} {...handlers} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Miesiąc$/ }));
    expect(handlers.onViewChange).toHaveBeenCalledWith("month");
    fireEvent.click(screen.getByRole("button", { name: "Następny tydzień" }));
    expect(handlers.onNavigate).toHaveBeenCalledWith(1);
  });
  it("hides empty weekend columns in the month and marks today", () => {
    render(
      <AvailabilityCalendar
        {...availabilityCalendarSample}
        {...callbacks()}
        view="month"
      />,
    );
    expect(screen.queryByText("so", { exact: true })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /poniedziałek, 7 stycznia, wolne terminy/i,
      }),
    ).toHaveAttribute("aria-current", "date");
  });
  it("retains weekend dates when a weekend time can be booked", () => {
    const weekend = {
      ...availabilityCalendarSample.days[0]!,
      date: "2030-01-12",
      slots: [{ time: "10:00", href: "/umow-wizyte?termin=2030-01-12T10:00" }],
    };
    render(
      <AvailabilityCalendar
        {...availabilityCalendarSample}
        {...callbacks()}
        view="month"
        days={[weekend]}
      />,
    );
    expect(screen.getByText("so", { exact: true })).toBeInTheDocument();
  });
  it("blocks the calendar during loading and supports retry after an error", () => {
    const handlers = callbacks();
    const { container, rerender } = render(
      <AvailabilityCalendar
        {...availabilityCalendarSample}
        {...handlers}
        status="loading"
      />,
    );
    expect(container.querySelector("[inert]")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Sprawdzamy wolne terminy",
    );
    expect(
      screen.queryByRole("button", { name: /wolny termin/ }),
    ).not.toBeInTheDocument();
    rerender(
      <AvailabilityCalendar
        {...availabilityCalendarSample}
        {...handlers}
        status="error"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    expect(handlers.onRetry).toHaveBeenCalledOnce();
  });
});
