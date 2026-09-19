import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Button } from "./button";

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
      <CardHeader>
        <CardTitle>Przykładowa karta</CardTitle>
        <CardDescription>
          Neutralna powierzchnia korzystająca ze wspólnych tokenów projektu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--text)]">
          Karty grupują powiązane informacje i akcje bez nadmiernego ciężaru.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Zobacz szczegóły</Button>
      </CardFooter>
    </Card>
  ),
};
