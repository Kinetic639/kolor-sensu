import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { Label } from "./label";
import { Switch } from "./switch";

const meta = {
  title: "Primitives/Switch",
  component: Switch,
  tags: ["autodocs"],
  parameters: {
    controls: { disable: true },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Switch id="notifications" aria-label="Powiadomienia" />
      <Label htmlFor="notifications">Powiadomienia</Label>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole("switch", { name: "Powiadomienia" });

    await userEvent.click(toggle);
    await expect(toggle).toBeChecked();
  },
};
