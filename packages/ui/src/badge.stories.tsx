import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta = {
  title: "Primitives/Badge",
  component: Badge,
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Statuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge>Neutralny</Badge>
      <Badge variant="primary">Wybrany</Badge>
      <Badge variant="success">Aktywny</Badge>
      <Badge variant="warning">Oczekuje</Badge>
      <Badge variant="danger">Wymaga uwagi</Badge>
      <Badge variant="info">Online</Badge>
      <Badge variant="lilac">Profil</Badge>
    </div>
  ),
};
