import type { Meta, StoryObj } from "@storybook/react";
import { CircularWatercolorImage } from "./watercolor-circle";

const meta = {
  title: "Public site/Circular WatercolorImage",
  component: CircularWatercolorImage,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: "min(75vw, 400px)", padding: "3rem" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    src: "/kolor-sensu/therapy-room-upload.png",
    alt: "Gabinet",
    variant: 3,
    rotation: 35,
  },
  argTypes: {
    variant: { control: "select", options: [1, 2, 3] },
    rotation: { control: { type: "range", min: 0, max: 359, step: 1 } },
  },
} satisfies Meta<typeof CircularWatercolorImage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const BrushReveal: Story = {
  args: { animationPreset: "watercolor-reveal" },
};
export const EdgeOnly: Story = { args: { watercolorSrc: null } };
