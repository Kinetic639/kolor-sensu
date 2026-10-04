import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { DraftReview } from "./draft-review";

// A profile draft waiting for review on the specialist's page: one line
// there, the changes and the decision in a dialog.

const meta = {
  title: "Portal/Specialists/Draft review",
  component: DraftReview,
  parameters: { layout: "fullscreen" },
  args: {
    name: "Anna Kłobuchowska",
    submitted: "przesłano 4 października 2026",
    review: async () => ({ ok: true as const }),
    fields: [
      {
        id: "shortBio",
        label: "Krótki opis",
        currentValue: "Profil testowy do weryfikacji listy specjalistów. Nowy.",
        proposedValue: "Profil testowy do weryfikacji listy specjalistów.",
        changed: true,
        multiline: true,
      },
      {
        id: "languages",
        label: "Języki",
        currentValue: "Polski",
        proposedValue: "Polski, Angielski",
        changed: true,
      },
    ],
  },
} satisfies Meta<typeof DraftReview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On the page: one line. */
export const Waiting: Story = {};

/** The changes, opened. */
export const Opened: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Przejrzyj zmiany" }),
    );
    const dialog = within(document.body).getByRole("dialog");
    await expect(within(dialog).getByText("Polski, Angielski")).toBeVisible();
  },
};
