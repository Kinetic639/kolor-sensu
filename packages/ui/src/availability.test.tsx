import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AvailabilityWeekPreview,
  TimeOffItem,
  WeeklySchedule,
} from "./availability";

describe("WeeklySchedule", () => {
  it("lists every weekday with its windows or a free day", () => {
    render(
      <WeeklySchedule
        days={[
          {
            weekday: 1,
            label: "Poniedziałek",
            windows: [
              {
                id: "a",
                timeLabel: "09:00–13:00",
                placeLabel: "Gabinet 1",
                mode: "in_person",
                recurrenceLabel: "Co tydzień",
                note: "Pierwszorazowi do 11:00",
              },
              {
                id: "b",
                timeLabel: "14:00–16:00",
                placeLabel: "Online",
                mode: "online",
                recurrenceLabel: "Co 2 tygodnie",
              },
            ],
            action: <button type="button">Dodaj w poniedziałek</button>,
          },
          { weekday: 2, label: "Wtorek", windows: [] },
        ]}
      />,
    );

    const monday = screen.getByRole("region", { name: "Poniedziałek" });
    const items = within(monday).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText("09:00–13:00")).toBeInTheDocument();
    expect(within(items[0]!).getByText("Gabinet 1")).toBeInTheDocument();
    expect(
      within(items[0]!).getByText("Pierwszorazowi do 11:00"),
    ).toBeInTheDocument();
    expect(within(items[1]!).getByText("Co 2 tygodnie")).toBeInTheDocument();
    expect(
      within(monday).getByRole("button", { name: "Dodaj w poniedziałek" }),
    ).toBeInTheDocument();

    const tuesday = screen.getByRole("region", { name: "Wtorek" });
    expect(within(tuesday).getByText("Brak godzin")).toBeInTheDocument();
  });
});

describe("AvailabilityWeekPreview", () => {
  it("shows the week's windows and time off per day", () => {
    render(
      <AvailabilityWeekPreview
        days={[
          {
            date: "2030-01-07",
            label: "pon. 7.01",
            isToday: true,
            windows: [
              {
                id: "w",
                timeLabel: "09:00–13:00",
                placeLabel: "Gabinet 1",
                mode: "hybrid",
              },
            ],
            timeOff: [],
          },
          {
            date: "2030-01-08",
            label: "wt. 8.01",
            windows: [],
            timeOff: [{ id: "t", label: "Cały dzień", reason: "Urlop" }],
          },
        ]}
        title="Tydzień 7–13 stycznia 2030"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Tydzień 7–13 stycznia 2030" }),
    ).toBeInTheDocument();
    const monday = screen.getByRole("listitem", { name: /pon\. 7\.01/ });
    expect(monday).toHaveAttribute("aria-current", "date");
    expect(within(monday).getByText("09:00–13:00")).toBeInTheDocument();
    expect(within(monday).getByText("Gabinet 1 + online")).toBeInTheDocument();
    const tuesday = screen.getByRole("listitem", { name: /wt\. 8\.01/ });
    expect(within(tuesday).getByText(/Urlop/)).toBeInTheDocument();
  });
});

describe("TimeOffItem", () => {
  it("shows the period, the reason and the actions", () => {
    render(
      <ul>
        <TimeOffItem
          actions={<button type="button">Usuń</button>}
          label="7–13 stycznia 2030"
          reason="Urlop"
        />
      </ul>,
    );
    expect(screen.getByText("7–13 stycznia 2030")).toBeInTheDocument();
    expect(screen.getByText("Urlop")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Usuń" })).toBeInTheDocument();
  });
});
