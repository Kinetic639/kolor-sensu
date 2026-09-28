import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AvailabilityBlockBody,
  AvailabilityRuleCard,
  OccupancyBar,
  StatDots,
  TimeOffItem,
} from "./availability";

describe("AvailabilityBlockBody", () => {
  it("shows the hours, the place and the note", () => {
    render(
      <AvailabilityBlockBody
        mode="hybrid"
        note="Pierwszorazowi do 11:00"
        placeLabel="Gabinet 1"
        timeLabel="09:00 – 13:00"
      />,
    );
    expect(screen.getByText("09:00 – 13:00")).toBeInTheDocument();
    expect(screen.getByText("Gabinet 1 + online")).toBeInTheDocument();
    expect(screen.getByText("Pierwszorazowi do 11:00")).toBeInTheDocument();
  });
});

describe("AvailabilityRuleCard", () => {
  it("describes a rule and offers its actions", () => {
    render(
      <AvailabilityRuleCard
        actions={<button type="button">Edytuj regułę</button>}
        durationLabel="6 godz."
        mode="in_person"
        note="Tylko dorośli"
        occupancy={{
          percent: 58,
          bookedLabel: "3,5 godz. zajęte (3 wizyty)",
          freeLabel: "2,5 godz. wolne",
        }}
        placeLabel="Gabinet 2"
        recurrenceLabel="Co tydzień"
        subtitle="od 7 stycznia 2030"
        timeLabel="09:00 – 15:00"
        title="Poniedziałek"
      />,
    );
    const card = screen.getByRole("article", { name: "Poniedziałek" });
    expect(within(card).getByText("Co tydzień")).toBeInTheDocument();
    expect(within(card).getByText("09:00 – 15:00")).toBeInTheDocument();
    expect(within(card).getByText("(6 godz.)")).toBeInTheDocument();
    expect(within(card).getByText("Gabinet 2")).toBeInTheDocument();
    expect(within(card).getByText("„Tylko dorośli”")).toBeInTheDocument();
    expect(within(card).getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "58",
    );
    expect(
      within(card).getByRole("button", { name: "Edytuj regułę" }),
    ).toBeInTheDocument();
  });
});

describe("OccupancyBar", () => {
  it("is a progress bar with a clamped value", () => {
    render(<OccupancyBar label="Rezerwacje" percent={130} />);
    expect(
      screen.getByRole("progressbar", { name: "Rezerwacje" }),
    ).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("StatDots", () => {
  it("lists labelled values", () => {
    render(
      <StatDots
        items={[
          { label: "Łączna dostępność", value: "6 godz.", tone: "primary" },
          { label: "Zarezerwowane wizyty", value: "0 godz.", tone: "info" },
        ]}
      />,
    );
    expect(screen.getByText("Łączna dostępność:")).toBeInTheDocument();
    expect(screen.getByText("6 godz.")).toBeInTheDocument();
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
