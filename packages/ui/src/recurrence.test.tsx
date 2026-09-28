import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecurrenceScopeDialog, WeekdayPicker } from "./recurrence";

describe("WeekdayPicker", () => {
  it("toggles days and keeps them in week order", () => {
    const onChange = vi.fn();
    render(
      <WeekdayPicker label="Powtarzaj w" onChange={onChange} value={[5, 1]} />,
    );

    expect(
      screen.getByRole("group", { name: "Powtarzaj w" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "poniedziałek" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "środa" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "środa" }));
    expect(onChange).toHaveBeenLastCalledWith([1, 3, 5]);
    fireEvent.click(screen.getByRole("button", { name: "piątek" }));
    expect(onChange).toHaveBeenLastCalledWith([1]);
  });

  it("does not let the last day be switched off", () => {
    const onChange = vi.fn();
    render(<WeekdayPicker label="Dni" onChange={onChange} value={[2]} />);
    fireEvent.click(screen.getByRole("button", { name: "wtorek" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("RecurrenceScopeDialog", () => {
  it("asks which occurrences, only this one by default", () => {
    const onConfirm = vi.fn();
    render(
      <RecurrenceScopeDialog
        confirmLabel="Usuń"
        description="Ten termin jest częścią reguły."
        onCancel={() => {}}
        onConfirm={onConfirm}
        open
        title="Usunąć termin cykliczny?"
      />,
    );

    expect(
      screen.getByRole("radio", { name: "Tylko ten termin" }),
    ).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Usuń" }));
    expect(onConfirm).toHaveBeenLastCalledWith("this");

    fireEvent.click(
      screen.getByRole("radio", { name: "Ten i następne terminy" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Usuń" }));
    expect(onConfirm).toHaveBeenLastCalledWith("following");

    fireEvent.click(screen.getByRole("radio", { name: "Wszystkie terminy" }));
    fireEvent.click(screen.getByRole("button", { name: "Usuń" }));
    expect(onConfirm).toHaveBeenLastCalledWith("all");
  });
});
