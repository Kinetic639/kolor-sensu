import type { Meta, StoryObj } from "@storybook/react";
import { HanddrawnLink } from "./handdrawn-link";

const meta = {
  title: "Public site/Handdrawn link",
  component: HanddrawnLink,
  decorators: [
    (Story) => (
      <div className="bg-bg text-ink font-body p-12">
        <Story />
      </div>
    ),
  ],
  args: { href: "/pomoc-w-kryzysie", children: "Więcej o pomocy w kryzysie" },
} satisfies Meta<typeof HanddrawnLink>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const InheritedColor: Story = {
  decorators: [
    (Story) => (
      <div style={{ color: "#9c5754" }}>
        <Story />
      </div>
    ),
  ],
};
