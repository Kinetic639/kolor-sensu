import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { SettlementList } from "./settlement-list";

// Money still owed to clients (R14), on the admin's dashboard: a refund
// Stripe refused, or a payment for a visit that never was.

const meta = {
  title: "Portal/Settlements",
  component: SettlementList,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
  args: {
    action: fn(async () => ({ ok: true as const })),
    items: [
      {
        id: "visit-1",
        reference: "2610-004",
        title: "Zwrot nie doszedł do skutku",
        description: "Jan Kowalski · 2610-004 · sob. 03.10, 11:00 · od 01.10",
        owedMinor: 5000,
        owed: "50 zł",
        clientName: "Jan Kowalski",
        href: "/rezerwacje?wizyta=visit-1",
      },
      {
        id: "visit-2",
        reference: "2610-009",
        title: "Płatność bez wizyty",
        description: "Ewa Nowak · 2610-009 · pt. 09.10, 10:00 · od 02.10",
        owedMinor: 20000,
        owed: "200 zł",
        clientName: "Ewa Nowak",
        href: "/rezerwacje?wizyta=visit-2",
      },
    ],
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SettlementList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two owed; giving back asks first. */
export const Owed: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Zwróć 50 zł" }),
    );
    const dialog = within(document.body).getByRole("alertdialog");
    await expect(dialog).toHaveTextContent(
      "Zwrócić 50 zł klientowi Jan Kowalski?",
    );
    await expect(args.action).not.toHaveBeenCalled();
  },
};

/** On a phone. */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
