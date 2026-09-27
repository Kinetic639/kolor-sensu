import type { Meta, StoryObj } from "@storybook/react";
import { sampleSpecialists, sampleSpecialistsCopy } from "./specialist-samples";
import { SpecialistsSection } from "./specialists-section";

// "Nasi specjaliści" as on the homepage: intro, then three
// SpecialistWatercolorCards. Reference:
// docs/design/references/public/specialists-concept.png.

const meta = {
  title: "Public site/SpecialistsSection",
  component: SpecialistsSection,
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink min-h-screen overflow-x-clip">
        <Story />
      </div>
    ),
  ],
  parameters: { canvasPadding: false },
  args: {
    specialists: sampleSpecialists,
    ...sampleSpecialistsCopy,
    animationPreset: "splash-reveal",
  },
  argTypes: {
    animationPreset: {
      control: "inline-radio",
      options: ["none", "splash-reveal"],
    },
    reducedMotionMode: {
      control: "inline-radio",
      options: ["static", "simple-fade"],
    },
  },
} satisfies Meta<typeof SpecialistsSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Intro on the left, three cards in a row, plates on one line. */
export const Desktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** Intro above, three smaller cards in a row. */
export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** Intro first, compact cards stacked. */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
