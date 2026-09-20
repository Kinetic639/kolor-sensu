import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileReviewDiff, SpecialistOfferRow } from "./specialist-admin";

describe("ProfileReviewDiff", () => {
  it("renders only fields that changed", () => {
    render(
      <ProfileReviewDiff
        fields={[
          {
            id: "displayName",
            label: "Nazwa publiczna",
            currentValue: "Anna Kowalska",
            proposedValue: "Anna Kowalska",
            changed: false,
          },
          {
            id: "languages",
            label: "Języki",
            currentValue: "Polski",
            proposedValue: "Polski, Angielski",
            changed: true,
          },
        ]}
      />,
    );

    expect(screen.queryByText("Nazwa publiczna")).not.toBeInTheDocument();
    expect(screen.getByText("Języki")).toBeInTheDocument();
    expect(screen.getByText("Polski, Angielski")).toBeInTheDocument();
  });

  it("shows an explicit message when the draft is unchanged", () => {
    render(<ProfileReviewDiff fields={[]} />);

    expect(
      screen.getByText("Szkic nie zmienia treści opublikowanego profilu."),
    ).toBeInTheDocument();
  });
});

describe("SpecialistOfferRow", () => {
  it("exposes independent offer controls", () => {
    const onActiveChange = vi.fn();
    const onAcceptingNewClientsChange = vi.fn();
    render(
      <ul>
        <SpecialistOfferRow
          acceptingNewClients={false}
          active
          durationLabel="50 min"
          onAcceptingNewClientsChange={onAcceptingNewClientsChange}
          onActiveChange={onActiveChange}
          priceLabel="220,00 zł"
          serviceName="Psychoterapia indywidualna"
          supportsInPerson
          supportsOnline
        />
      </ul>,
    );

    fireEvent.click(
      screen.getByRole("switch", {
        name: "Przyjmowanie nowych klientów dla Psychoterapia indywidualna",
      }),
    );
    fireEvent.click(
      screen.getByRole("switch", {
        name: "Aktywność oferty Psychoterapia indywidualna",
      }),
    );

    expect(onAcceptingNewClientsChange).toHaveBeenCalledWith(true);
    expect(onActiveChange).toHaveBeenCalledWith(false);
  });
});
