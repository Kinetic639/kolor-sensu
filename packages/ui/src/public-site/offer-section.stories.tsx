import type { Meta, StoryObj } from "@storybook/react";
import { sampleOfferCopy, sampleServices } from "./offer-samples";
import { OfferSection } from "./offer-section";

// "Nasza oferta" as on the homepage: intro, then four OfferTiles painted in
// with brush strokes. Reference A (homepage-concept.png).

const meta = {
  title: "Public site/OfferSection",
  component: OfferSection,
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink min-h-screen overflow-x-clip">
        <Story />
      </div>
    ),
  ],
  parameters: { canvasPadding: false },
  args: {
    services: sampleServices,
    ...sampleOfferCopy,
    animationPreset: "brush-reveal",
  },
  argTypes: {
    animationPreset: {
      control: "inline-radio",
      options: ["none", "brush-reveal"],
    },
    reducedMotionMode: {
      control: "inline-radio",
      options: ["static", "simple-fade"],
    },
  },
} satisfies Meta<typeof OfferSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Intro on the left, four tiles in a row. */
export const Desktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** Intro above, four tiles in a row. */
export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** Intro first, then a 2 x 2 grid of tiles. */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
