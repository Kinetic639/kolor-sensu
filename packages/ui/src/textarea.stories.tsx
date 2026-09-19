import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "./label";
import { Textarea } from "./textarea";

const meta = {
  title: "Primitives/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: { placeholder: "Dodaj krótką notatkę..." },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid max-w-md gap-2">
      <Label htmlFor="notes">Notatka</Label>
      <Textarea id="notes" {...args} />
    </div>
  ),
};

export const Error: Story = {
  args: { "aria-invalid": true, defaultValue: "Za krótki opis" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Pole tylko do odczytu" },
};
