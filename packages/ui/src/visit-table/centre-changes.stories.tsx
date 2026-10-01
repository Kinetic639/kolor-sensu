import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { CancelVisitDialog, RefundVisitDialog } from "./centre-changes";

// The centre settling a visit (R12): cancelling at any time with the refund
// the admin chooses, and giving money back later.

const visit = {
  id: "visit-1",
  reference: "3010-017",
  label: "Jan Kowalski, środa, 2 października 2030, 11:00–11:50",
  refundableMinor: 20000,
  currencyCode: "PLN",
  email: "jan@example.com",
};

const meta = {
  title: "Portal/Centre changes",
  component: CancelVisitDialog,
  parameters: { layout: "centered", nextjs: { appDirectory: true } },
  args: {
    visit,
    open: true,
    onOpenChange: fn(),
    action: fn(async () => ({ ok: true as const })),
  },
} satisfies Meta<typeof CancelVisitDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All back by default; the admin may give back less. */
export const Cancel: Story = {
  play: async () => {
    const dialog = within(document.body).getByRole("alertdialog");
    await expect(
      within(dialog).getByLabelText("Kwota zwrotu (zł)"),
    ).toHaveValue("200");
  },
};

/** Cancelled the same day: 100 zł kept, and why. */
export const LateCancellation: Story = {
  play: async () => {
    const dialog = within(document.body).getByRole("alertdialog");
    const amount = within(dialog).getByLabelText("Kwota zwrotu (zł)");
    await userEvent.clear(amount);
    await userEvent.type(amount, "100");
    await userEvent.type(
      within(dialog).getByLabelText("Powód (zobaczy go klient)"),
      "Odwołanie w dniu wizyty",
    );
    await expect(
      within(dialog).getByText(/Zatrzymane: 100\s?zł/),
    ).toBeVisible();
  },
};

/** A reservation not paid yet: nothing to give back. */
export const Unpaid: Story = {
  args: { visit: { ...visit, refundableMinor: 0 } },
};

/** Money back later, on a visit already cancelled. */
export const Refund: StoryObj<typeof RefundVisitDialog> = {
  render: (args) => <RefundVisitDialog {...args} />,
  args: {
    visit: { ...visit, refundableMinor: 15000 },
    open: true,
    onOpenChange: fn(),
    action: fn(async () => ({ ok: true as const })),
  },
};
