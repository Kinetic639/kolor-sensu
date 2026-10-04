import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { OfferArrangement } from "./offer-arrangement";
import { SAMPLE_SERVICES } from "./services.samples";

// Oferta → "Kolejność i katalogi": the site's menu arranged in one place.
// The first level (services outside a catalogue, and the catalogues) and
// each catalogue's services are dragged by their handles; a service
// changes catalogue by its field; all of it is saved at once.

const items = SAMPLE_SERVICES.map((row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  paint: row.paint,
  active: row.active,
  publiclyVisible: row.publiclyVisible,
  catalogId: row.catalog?.id ?? null,
  sortOrder: row.order,
}));
const catalogs = [
  { id: "7a1c0000-0000-4000-8000-000000000001", name: "Terapie", sortOrder: 2 },
];
const save = fn(async () => ({ ok: true as const }));

const meta = {
  title: "Portal/Services/Arrangement",
  component: OfferArrangement,
  args: { items, catalogs, action: save },
  parameters: { controls: { disable: true }, layout: "padded" },
  decorators: [
    (Story) => (
      <div className="flex h-[38rem] max-w-xl flex-col border border-[var(--border)] bg-[var(--surface)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OfferArrangement>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Arrangement: Story = {};

/** A new catalogue, a service moved into it, saved. */
export const NewCatalogue: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Nowy katalog" }));
    await userEvent.selectOptions(
      canvas.getByRole("combobox", {
        name: "Katalog: Wsparcie dla dzieci i młodzieży",
      }),
      "Nowy katalog",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Zapisz układ" }));
    await expect(save).toHaveBeenCalled();
  },
};
