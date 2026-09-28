import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { WeeklyHoursEditor, type WeeklyHoursDay } from "./weekly-hours";

const week: WeeklyHoursDay[] = Array.from({ length: 7 }, (_, index) => ({
  weekday: index + 1,
  open: index < 5,
  intervals: [{ startsAt: "08:00", endsAt: "18:00" }],
}));

function Demo({ errors }: { errors?: Record<string, string> }) {
  const [value, setValue] = useState(week);
  return (
    <>
      <WeeklyHoursEditor errors={errors} onChange={setValue} value={value} />
      <output>{JSON.stringify(value[0])}</output>
    </>
  );
}

describe("WeeklyHoursEditor", () => {
  it("lists the week; closed days have no hours", () => {
    render(<Demo />);
    expect(
      screen.getByRole("switch", { name: "poniedziałek otwarte" }),
    ).toBeChecked();
    expect(
      screen.getByRole("switch", { name: "sobota otwarte" }),
    ).not.toBeChecked();
    expect(screen.getByLabelText("Od, poniedziałek")).toHaveValue("08:00");
    expect(screen.queryByLabelText("Od, sobota")).not.toBeInTheDocument();
    expect(screen.getAllByText("Zamknięte")).toHaveLength(2);
  });

  it("changes hours, adds and removes intervals", () => {
    render(<Demo />);
    fireEvent.change(screen.getByLabelText("Do, poniedziałek"), {
      target: { value: "12:00" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Dodaj przedział: poniedziałek" }),
    );
    expect(screen.getByLabelText("Od, poniedziałek, przedział 2")).toHaveValue(
      "13:00",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      '"intervals":[{"startsAt":"08:00","endsAt":"12:00"},{"startsAt":"13:00","endsAt":"18:00"}]',
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Usuń przedział 2: poniedziałek",
      }),
    );
    expect(
      screen.queryByLabelText("Od, poniedziałek, przedział 2"),
    ).not.toBeInTheDocument();
  });

  it("opens and closes a day", () => {
    render(<Demo />);
    fireEvent.click(
      screen.getByRole("switch", { name: "poniedziałek otwarte" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent('"open":false');
  });

  it("shows errors by day and interval", () => {
    render(<Demo errors={{ "0.0": "Koniec musi być po początku." }} />);
    expect(screen.getByLabelText("Do, poniedziałek")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByText("Koniec musi być po początku."),
    ).toBeInTheDocument();
  });
});
