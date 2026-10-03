import { render, screen } from "@testing-library/react";
import { AlertCircle, CalendarDays } from "lucide-react";
import { describe, expect, it } from "vitest";
import { SpecialistDashboard } from "./portal-dashboards";

const baseProps = {
  title: "Panel główny",
  metrics: [
    {
      id: "visits",
      label: "Wizyty dziś",
      value: 4,
      icon: CalendarDays,
      tone: "mint" as const,
    },
  ],
  appointments: [
    {
      id: "appointment-1",
      time: "09:00",
      duration: "50 min",
      clientName: "Julia Nowak",
      service: "Psychoterapia indywidualna",
      location: "Gabinet Zielony",
    },
  ],
  attention: [
    {
      id: "attention-1",
      title: "Uzupełnij notatkę",
      description: "Wizyta zakończona wczoraj.",
      icon: AlertCircle,
      tone: "warning" as const,
    },
  ],
};

describe("portal dashboard compositions", () => {
  it("renders the specialist availability and services regions", () => {
    render(
      <SpecialistDashboard
        {...baseProps}
        availability={[
          {
            id: "monday",
            day: "Pon",
            date: "21.09",
            hours: "09–17",
            available: true,
          },
        ]}
        services={[]}
        events={[]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Dzisiejszy grafik" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Dostępność w tym tygodniu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Moje usługi i stawki" }),
    ).toBeInTheDocument();
  });
});
