import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "Primitives/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  parameters: {
    controls: { disable: true },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs className="max-w-md" defaultValue="details">
      <TabsList aria-label="Widok wizyty">
        <TabsTrigger value="details">Szczegóły</TabsTrigger>
        <TabsTrigger value="notes">Notatki</TabsTrigger>
      </TabsList>
      <TabsContent value="details">Informacje o spotkaniu.</TabsContent>
      <TabsContent value="notes">Miejsce na notatki.</TabsContent>
    </Tabs>
  ),
};
