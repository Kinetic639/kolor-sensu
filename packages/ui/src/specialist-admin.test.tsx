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

  it("shows photos next to each other when a field has images", () => {
    render(
      <ProfileReviewDiff
        fields={[
          {
            id: "portraitPhoto",
            label: "Zdjęcie portretowe",
            currentValue: "Brak zdjęcia",
            proposedValue: "Nowe zdjęcie",
            changed: true,
            currentImageUrl: null,
            proposedImageUrl: "https://signed/new.jpg",
          },
        ]}
      />,
    );

    expect(screen.getByText("Brak zdjęcia")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Zdjęcie portretowe – propozycja" }),
    ).toHaveAttribute("src", "https://signed/new.jpg");
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

  it("shows the description and an edit action when given", () => {
    const onEdit = vi.fn();
    render(
      <ul>
        <SpecialistOfferRow
          acceptingNewClients
          active={false}
          description="Regularne spotkania terapeutyczne"
          durationLabel="50 min"
          onEdit={onEdit}
          priceLabel="200,00 zł"
          serviceName="Psychoterapia indywidualna"
          supportsInPerson
          supportsOnline={false}
        />
      </ul>,
    );

    expect(
      screen.getByText("Regularne spotkania terapeutyczne"),
    ).toBeInTheDocument();
    expect(screen.getByText("Nieaktywna")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Edytuj: Psychoterapia indywidualna",
      }),
    );
    expect(onEdit).toHaveBeenCalled();
  });

  it("leaves out the activity switch without a handler", () => {
    render(
      <ul>
        <SpecialistOfferRow
          acceptingNewClients
          active
          durationLabel="50 min"
          onAcceptingNewClientsChange={() => {}}
          priceLabel="200,00 zł"
          serviceName="Terapia par"
          supportsInPerson
          supportsOnline
        />
      </ul>,
    );

    expect(screen.getAllByRole("switch")).toHaveLength(1);
    expect(screen.getByText("Stacjonarnie")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });
});
