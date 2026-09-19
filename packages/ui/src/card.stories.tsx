import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./card";

const meta = {
  title: "Primitives/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    controls: { disable: true },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-md">
      <h2 className="text-lg font-semibold">Przykładowa karta</h2>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Neutralna powierzchnia korzystająca ze wspólnych tokenów projektu.
      </p>
    </Card>
  ),
};
