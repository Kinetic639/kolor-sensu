import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompactBookingCalendar } from "./compact-booking-calendar";
import { compactBookingSample } from "./compact-booking-samples";
describe("CompactBookingCalendar", () => {
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
