import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  OccupancyRing,
  RoomScheduleBlockBody,
  ScheduleFigure,
} from "./room-schedule";

describe("RoomScheduleBlockBody", () => {
  it("shows who and when, with the form of work", () => {
    render(
      <RoomScheduleBlockBody
        initials="AN"
        mode="hybrid"
        name="Anna Nowak"
        timeLabel="09:00 – 12:00"
      />,
    );
    expect(screen.getByText("09:00 – 12:00")).toBeInTheDocument();
    expect(screen.getByText("Anna Nowak")).toBeInTheDocument();
    expect(screen.getByText("AN")).toBeInTheDocument();
    expect(screen.getByText("Stacjonarnie + online")).toBeInTheDocument();
  });

  it("warns about hours outside the opening hours", () => {
    render(
      <RoomScheduleBlockBody
        initials="JK"
        mode="in_person"
        name="Jan Kowalski"
        timeLabel="17:00 – 19:00"
        warning="Poza godzinami otwarcia"
      />,
    );
    expect(screen.getByText("Poza godzinami otwarcia")).toBeInTheDocument();
  });
});

describe("OccupancyRing", () => {
  it("is a progress meter with its label", () => {
    render(
      <OccupancyRing
        detail="3 z 40 godz."
        label="Obłożenie gabinetu"
        percent={8}
      />,
    );
    const meter = screen.getByRole("progressbar", {
      name: "Obłożenie gabinetu",
    });
    expect(meter).toHaveAttribute("aria-valuenow", "8");
    expect(screen.getByText("8%")).toBeInTheDocument();
    expect(screen.getByText("3 z 40 godz.")).toBeInTheDocument();
  });

  it("shows a dash without a percentage", () => {
    render(<OccupancyRing label="Obłożenie gabinetu" percent={null} />);
    expect(screen.getByText("–")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

describe("ScheduleFigure", () => {
  it("is a term and its value", () => {
    render(
      <dl>
        <ScheduleFigure label="Zarezerwowane" value="7 godz." />
      </dl>,
    );
    expect(screen.getByRole("term")).toHaveTextContent("Zarezerwowane");
    expect(screen.getByRole("definition")).toHaveTextContent("7 godz.");
  });
});
