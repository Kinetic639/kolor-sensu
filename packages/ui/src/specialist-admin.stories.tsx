import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import {
  ProfileReviewDiff,
  SpecialistOfferRow,
  SpecialistStatusSummary,
} from "./specialist-admin";

const meta = {
  title: "Portal/Specialist Admin",
  parameters: { controls: { disable: true } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const StatusSummary: Story = {
  render: () => (
    <SpecialistStatusSummary
      acceptingNewClients
      accountActive
      active
      publicationLabel="Profil opublikowany"
      publicationTone="success"
    />
  ),
};

export const ReviewDiff: Story = {
  render: () => (
    <div className="max-w-4xl">
      <ProfileReviewDiff
        fields={[
          {
            id: "shortBio",
            label: "Krótki opis",
            currentValue: "Pomagam dorosłym w kryzysach życiowych.",
            proposedValue:
              "Pomagam dorosłym i młodym dorosłym w kryzysach życiowych.",
            changed: true,
            multiline: true,
          },
          {
            id: "languages",
            label: "Języki",
            currentValue: "Polski",
            proposedValue: "Polski, Angielski",
            changed: true,
          },
          {
            id: "profilePhoto",
            label: "Zdjęcie profilowe",
            currentValue: "Brak zdjęcia",
            proposedValue: "Nowe zdjęcie",
            changed: true,
            currentImageUrl: null,
            proposedImageUrl: "/kolor-sensu/anna.jpg",
          },
        ]}
      />
    </div>
  ),
};

// The row is controlled (its switches show the props); the screen using it
// holds the state, as this wrapper does.
function OfferRowWithState() {
  const [active, setActive] = useState(true);
  const [accepting, setAccepting] = useState(true);
  return (
    <ul className="max-w-4xl rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] px-5">
      <SpecialistOfferRow
        acceptingNewClients={accepting}
        active={active}
        durationLabel="50 min"
        onAcceptingNewClientsChange={setAccepting}
        onActiveChange={setActive}
        priceLabel="220,00 zł"
        serviceName="Psychoterapia indywidualna"
        supportsInPerson
        supportsOnline
      />
    </ul>
  );
}

export const OfferRow: Story = {
  render: () => <OfferRowWithState />,
  play: async ({ canvas, userEvent }) => {
    const acceptingToggle = canvas.getByRole("switch", {
      name: "Przyjmowanie nowych klientów dla Psychoterapia indywidualna",
    });

    await userEvent.click(acceptingToggle);
    await expect(acceptingToggle).not.toBeChecked();
  },
};

// The specialist's own list: no activity switch (it lives in the edit
// dialog), a description from the catalogue and an edit action.
const onEdit = fn();

export const SpecialistOwnOffers: Story = {
  render: () => (
    <ul className="max-w-4xl rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] px-5">
      <SpecialistOfferRow
        acceptingNewClients
        active
        description="Pierwsza rozmowa i diagnoza potrzeb"
        durationLabel="50 min"
        onAcceptingNewClientsChange={() => {}}
        onEdit={onEdit}
        priceLabel="150,00 zł"
        serviceName="Konsultacja psychologiczna"
        supportsInPerson
        supportsOnline={false}
      />
      <SpecialistOfferRow
        acceptingNewClients={false}
        active={false}
        description="Praca rozwojowa w formie warsztatu"
        durationLabel="90 min"
        onAcceptingNewClientsChange={() => {}}
        onEdit={() => {}}
        priceLabel="180,00 zł"
        serviceName="Warsztat indywidualny"
        supportsInPerson
        supportsOnline
      />
    </ul>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Edytuj: Konsultacja psychologiczna",
      }),
    );
    await expect(onEdit).toHaveBeenCalled();
  },
};
