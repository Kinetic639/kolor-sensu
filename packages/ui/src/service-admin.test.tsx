import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServiceStatusBadges, SpecialistOfferSummary } from "./service-admin";

describe("admin service presentation", () => {
  it("renders lifecycle statuses as text", () => {
    render(
      <ServiceStatusBadges
        active={false}
        bookingEnabled={false}
        publiclyVisible
      />,
    );
    expect(screen.getByText("Nieaktywna")).toBeInTheDocument();
    expect(screen.getByText("Publiczna")).toBeInTheDocument();
    expect(screen.getByText("Booking wyłączony")).toBeInTheDocument();
  });
  it("renders specialist pricing separately", () => {
    render(
      <ul>
        <SpecialistOfferSummary
          active
          durationLabel="50 min"
          priceLabel="220,00 zł"
          professionalTitle={null}
          specialistName="Anna Kowalska"
          supportsInPerson
          supportsOnline={false}
        />
      </ul>,
    );
    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument();
    expect(screen.getByText(/220,00 zł/)).toBeInTheDocument();
  });
});
