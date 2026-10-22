import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkshopCard, WorkshopFacts, WorkshopGrid } from "./workshop-parts";
import { sampleWorkshops } from "./workshop-samples";

const [open, few, full, cancelled] = sampleWorkshops;

describe("a workshop's card", () => {
  it("links by its title and says when, where and for how much", () => {
    render(<WorkshopCard headingLevel="h2" workshop={open!} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Uważność na co dzień" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Uważność na co dzień" }),
    ).toHaveAttribute("href", "/warsztaty/uwaznosc-na-co-dzien");
    expect(screen.getByText(/wtorek, 12 listopada 2030/)).toBeInTheDocument();
    expect(screen.getByText("150 zł")).toBeInTheDocument();
    expect(screen.getByText("Prowadzi: Anna Nowak")).toBeInTheDocument();
  });

  it("shows the seats left, a full one and a cancelled one", () => {
    render(<WorkshopGrid workshops={[few!, full!, cancelled!]} />);
    expect(screen.getByText("Ostatnie 2 miejsca")).toBeInTheDocument();
    expect(
      screen.getByText("Brak miejsc · lista rezerwowa"),
    ).toBeInTheDocument();
    expect(screen.getByText("Odwołany")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
  });
});

describe("a workshop's facts", () => {
  it("are a description list", () => {
    render(
      <WorkshopFacts
        facts={[
          { icon: "date", label: "Termin", value: "12 listopada" },
          { icon: "place", label: "Miejsce", value: "Online" },
        ]}
      />,
    );
    expect(screen.getByText("Termin").tagName).toBe("DT");
    expect(screen.getByText("Online").tagName).toBe("DD");
  });
});
