import type { Meta, StoryObj } from "@storybook/react";
import { ClosingBanner } from "./closing-banner";

const meta = {
  title: "Public site/Closing banner",
  component: ClosingBanner,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink pt-32 pb-12">
        <Story />
      </div>
    ),
  ],
  args: {
    heading: "Zrób pierwszy krok do lepszego samopoczucia",
    bookingLabel: "Umów wizytę",
    contactLabel: "Skontaktuj się",
  },
} satisfies Meta<typeof ClosingBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ShortHeading: Story = {
  args: { heading: "Umów się na wizytę." },
};

export const SpecialistInvitation: Story = {
  args: { heading: "Nie wiesz, do kogo się zapisać?" },
};

export const LongCmsContent: Story = {
  args: {
    heading:
      "Zrób pierwszy krok w stronę lepszego samopoczucia. Znajdź przestrzeń na rozmowę, wsparcie i zmianę we własnym tempie.",
    bookingLabel: "Zarezerwuj pierwszą konsultację",
    contactLabel: "Porozmawiaj z naszym zespołem",
  },
};
