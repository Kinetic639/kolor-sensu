import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TIME_OPTIONS, TimeSelect } from "./time-select";

describe("TimeSelect", () => {
  it("offers the day in 15-minute steps, in 24-hour time", () => {
    expect(TIME_OPTIONS[0]).toBe("00:00");
    expect(TIME_OPTIONS.at(-1)).toBe("23:45");
    expect(TIME_OPTIONS).toHaveLength(96);
  });

  it("is a labelled select that reports the chosen time", () => {
    const onChange = vi.fn();
    render(<TimeSelect aria-label="Od" onChange={onChange} value="08:00" />);
    const select = screen.getByRole("combobox", { name: "Od" });
    expect(select).toHaveValue("08:00");
    expect(screen.getByRole("option", { name: "18:00" })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "12:30" } });
    expect(onChange).toHaveBeenCalledWith("12:30");
  });

  it("keeps a stored time that is not on the grid", () => {
    render(<TimeSelect aria-label="Do" onChange={() => {}} value="10:10" />);
    expect(screen.getByRole("combobox", { name: "Do" })).toHaveValue("10:10");
  });
});
