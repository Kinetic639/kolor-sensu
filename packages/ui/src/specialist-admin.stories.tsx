import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
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
        ]}
      />
    </div>
  ),
};

export const OfferRow: Story = {
  render: () => (
    <ul className="max-w-4xl rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] px-5">
      <SpecialistOfferRow
        acceptingNewClients
        active
        durationLabel="50 min"
        priceLabel="220,00 zł"
        serviceName="Psychoterapia indywidualna"
        supportsInPerson
        supportsOnline
      />
    </ul>
  ),
  play: async ({ canvas, userEvent }) => {
    const acceptingToggle = canvas.getByRole("switch", {
      name: "Przyjmowanie nowych klientów dla Psychoterapia indywidualna",
    });

    await userEvent.click(acceptingToggle);
    await expect(acceptingToggle).not.toBeChecked();
  },
};
