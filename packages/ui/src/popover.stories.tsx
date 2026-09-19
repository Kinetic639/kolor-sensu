import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const meta = {
  title: "Primitives/Popover",
  component: Popover,
  tags: ["autodocs"],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="secondary">Filtry</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="font-heading text-lg font-semibold">Filtry widoku</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Ustawienia pozostają blisko elementu, którego dotyczą.
        </p>
      </PopoverContent>
    </Popover>
  ),
};
