import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
  args: {
    placeholder: "Wpisz imię i nazwisko",
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="storybook-name">Imię i nazwisko</Label>
      <Input id="storybook-name" {...args} />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: "Pole niedostępne",
  },
};
