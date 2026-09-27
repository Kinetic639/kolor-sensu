import type { Meta, StoryObj } from "@storybook/react";
import { sampleHero } from "./hero-samples";
import { HeroSection } from "./hero-section";

// The homepage's first screen (reference A): pink eyebrow, H1 with a green
// second line, lead, actions, reassurances, and the painted hero picture
// (WatercolorImage) with its brush-stroke entrance.

const meta = {
  title: "Public site/HeroSection",
  component: HeroSection,
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink min-h-screen overflow-x-clip">
        <Story />
      </div>
    ),
  ],
  parameters: { canvasPadding: false },
  args: { ...sampleHero, animationPreset: "watercolor-reveal" },
  argTypes: {
    animationPreset: {
      control: "inline-radio",
      options: ["none", "watercolor-reveal"],
    },
    reducedMotionMode: {
      control: "inline-radio",
      options: ["static", "simple-fade"],
    },
  },
} satisfies Meta<typeof HeroSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Text and picture side by side; the picture paints itself in. */
export const Desktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** Text above the picture. */
export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** Text first, then the picture; reassurances in two columns. */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};

/** `animationPreset="none"`: the finished composition, no script. */
export const Static: Story = {
  args: { animationPreset: "none" },
  globals: { viewport: { value: "desktop", isRotated: false } },
};
