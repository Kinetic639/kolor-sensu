import type { Meta, StoryObj } from "@storybook/react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta = {
  title: "Primitives/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="max-w-xs" aria-label="Status wizyty">
        <SelectValue placeholder="Wybierz status" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Status</SelectLabel>
          <SelectItem value="all">Wszystkie statusy</SelectItem>
          <SelectItem value="confirmed">Potwierdzone</SelectItem>
          <SelectItem value="pending">Oczekujące</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="max-w-xs" aria-label="Specjalizacja">
        <SelectValue placeholder="Specjalizacja" />
      </SelectTrigger>
    </Select>
  ),
};
