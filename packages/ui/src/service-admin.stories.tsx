import type { Meta, StoryObj } from "@storybook/react";
import { ServiceStatusBadges, SpecialistOfferSummary } from "./service-admin";

const meta = { title: "Portal/Admin Services" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Statuses: Story = {
  render: () => <ServiceStatusBadges active bookingEnabled publiclyVisible />,
};
export const SpecialistOffer: Story = {
  render: () => (
    <ul className="max-w-3xl rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] px-5">
      <SpecialistOfferSummary
        active
        durationLabel="50 min"
        priceLabel="220,00 zł"
        professionalTitle="Psychoterapeutka"
        specialistName="Anna Kowalska"
        supportsInPerson
        supportsOnline
      />
    </ul>
  ),
};
