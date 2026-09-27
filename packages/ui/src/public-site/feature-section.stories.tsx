import type { Meta, StoryObj } from "@storybook/react";
import { sampleRooms, sampleWorkshops } from "./feature-samples";
import { FeatureSection } from "./feature-section";

// A painted picture beside a short intro, on either side (reference A:
// "Nasze gabinety", "Warsztaty i rozwój").

const meta = {
  title: "Public site/FeatureSection",
  component: FeatureSection,
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink min-h-screen overflow-x-clip">
        <Story />
      </div>
    ),
  ],
  parameters: { canvasPadding: false },
  args: { ...sampleRooms, animationPreset: "watercolor-reveal" },
  argTypes: {
    imagePosition: { control: "inline-radio", options: ["left", "right"] },
    animationPreset: {
      control: "inline-radio",
      options: ["none", "watercolor-reveal"],
    },
    reducedMotionMode: {
      control: "inline-radio",
      options: ["static", "simple-fade"],
    },
  },
} satisfies Meta<typeof FeatureSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** "Nasze gabinety": picture on the left, intro on the right. */
export const ImageLeft: Story = {
  name: "Image Left (Gabinety)",
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** "Warsztaty i rozwój": intro on the left, picture on the right. */
export const ImageRight: Story = {
  name: "Image Right (Warsztaty)",
  args: { ...sampleWorkshops, animationPreset: "watercolor-reveal" },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** Both variants one after another, as on the homepage. */
export const Alternating: Story = {
  render: (args) => (
    <>
      <FeatureSection {...args} {...sampleRooms} />
      <FeatureSection {...args} {...sampleWorkshops} />
    </>
  ),
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** Intro above the picture. */
export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** Intro above the picture, for either position. */
export const Mobile: Story = {
  render: (args) => (
    <>
      <FeatureSection {...args} {...sampleRooms} />
      <FeatureSection {...args} {...sampleWorkshops} />
    </>
  ),
  globals: { viewport: { value: "mobile", isRotated: false } },
};

/** `animationPreset="none"`: the finished picture, no script. */
export const Static: Story = {
  args: { animationPreset: "none" },
  globals: { viewport: { value: "desktop", isRotated: false } },
};
