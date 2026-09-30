import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { Button } from "./button";
import { VisitList } from "./visit-list";
import { adminVisitDays, specialistVisitDays } from "./visit-list.samples";

const meta = {
  title: "Portal/Visit list",
  component: VisitList,
  parameters: { controls: { disable: true } },
  decorators: [
    (Story) => (
      <div className="max-w-5xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VisitList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The admin: everyone's visits, the money, and cancelling. */
export const Admin: Story = {
  args: {
    days: adminVisitDays,
    showSpecialist: true,
    actions: Object.fromEntries(
      adminVisitDays
        .flatMap((day) => day.visits)
        .filter((visit) => visit.cancellable)
        .map((visit) => [
          visit.id,
          <Button key={visit.id} size="sm" variant="secondary">
            Odwołaj
          </Button>,
        ]),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText(/Zwrot do zlecenia/)).toBeVisible();
    const [summary] = canvas.getAllByText("Dane klienta");
    await userEvent.click(summary!);
    await expect(canvas.getAllByText("600 100 200")[0]).toBeVisible();
  },
};

/** A specialist: their own visits, no payments. */
export const Specialist: Story = {
  args: { days: specialistVisitDays },
};

export const Empty: Story = {
  args: { days: [], emptyText: "W tym tygodniu nie ma umówionych wizyt." },
};

export const Mobile: Story = {
  args: { days: adminVisitDays, showSpecialist: true },
  globals: { viewport: { value: "mobile", isRotated: false } },
};
