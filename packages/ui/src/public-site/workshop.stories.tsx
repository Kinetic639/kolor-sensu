import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { WorkshopCard, WorkshopFacts, WorkshopGrid } from "./workshop-parts";
import { sampleWorkshops } from "./workshop-samples";

// Warsztaty: the cards (with seats, a few left, full, cancelled) and the
// facts beside a workshop's title.

const paper: Decorator = (Story) => (
  <div className="bg-bg font-body text-ink max-w-page px-gutter mx-auto min-h-screen py-12">
    <Story />
  </div>
);

const meta = {
  title: "Public site/Workshop",
  decorators: [paper],
  parameters: { canvasPadding: false },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cards: Story = {
  render: () => <WorkshopGrid workshops={sampleWorkshops} />,
};

export const OneCard: Story = {
  render: () => (
    <div className="max-w-sm">
      <WorkshopCard workshop={sampleWorkshops[1]!} />
    </div>
  ),
};

export const Facts: Story = {
  render: () => (
    <WorkshopFacts
      className="max-w-md"
      facts={[
        {
          icon: "date",
          label: "Termin",
          value: "wtorek, 12 listopada 2030, 17:00–19:00",
        },
        {
          icon: "place",
          label: "Miejsce",
          value: "Kolor Sensu, ul. Spokojna 1, Warszawa (Sala duża)",
        },
        { icon: "people", label: "Prowadzi", value: "Anna Nowak" },
      ]}
    />
  ),
};
