import type { Meta, StoryObj } from "@storybook/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { CentreChangeResult } from "@repo/contracts/centre-changes";
import { expect, fn, userEvent, within } from "storybook/test";
import { AddVisitBanner } from "./add-visit";
import { MoveVisitPanel } from "./move-visit-panel";

// Moving a visit as the centre (R12): the banner while picking the new
// place in the grid, then the move's form beside the calendar.

const VISIT = "66666666-6666-4666-8666-666666666666";
const G1 = "33333333-3333-4333-8333-333333333331";
const G2 = "33333333-3333-4333-8333-333333333332";

const meta = {
  title: "Portal/Move visit",
  component: MoveVisitPanel,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NuqsTestingAdapter
        searchParams={`?przesun=${VISIT}&nowa=true&termin=2030-10-02T15:00`}
      >
        <div className="flex justify-end">
          <Story />
        </div>
      </NuqsTestingAdapter>
    ),
  ],
  args: {
    visit: {
      id: VISIT,
      reference: "3010-017",
      clientName: "Jan Kowalski",
      serviceName: "Konsultacja psychologiczna",
      specialistName: "Anna Nowak",
      current: "środa, 2 października 2030, 11:00–11:50 · Gabinet 1",
    },
    defaults: {
      date: "2030-10-02",
      time: "15:00",
      mode: "in_person",
      roomId: G1,
    },
    rooms: [
      { id: G1, name: "Gabinet 1", locationName: "Mokotowska 46" },
      { id: G2, name: "Gabinet 2", locationName: "Mokotowska 46" },
    ],
    action: fn(async (): Promise<CentreChangeResult> => ({ ok: true })),
    closeHref: "?",
  },
} satisfies Meta<typeof MoveVisitPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The place picked in the grid: a new time in another room. */
export const PickedInTheGrid: Story = {
  play: async ({ canvas }) => {
    const panel = canvas.getByRole("complementary", { name: "Przesuń wizytę" });
    await expect(within(panel).getByLabelText("Gabinet")).toHaveValue(G1);
  },
};

/** Online: no room to choose. */
export const Online: Story = {
  args: {
    defaults: {
      date: "2030-10-02",
      time: "15:00",
      mode: "online",
      roomId: null,
    },
  },
};

/** The database refused: the room is taken then. */
export const Refused: Story = {
  args: {
    action: fn(async (): Promise<CentreChangeResult> => ({
      ok: false,
      message: "Gabinet jest wtedy zajęty.",
      fields: { time: "Wybierz inną godzinę." },
    })),
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Przesuń wizytę" }),
    );
    await expect(
      await canvas.findByText("Wybierz inną godzinę."),
    ).toBeVisible();
  },
};

/** While picking: which visit is being moved. */
export const PickingBanner: StoryObj<typeof AddVisitBanner> = {
  render: () => (
    <AddVisitBanner
      cancelHref="?"
      manualHref="?termin=2030-10-02T11:00"
      moving={{
        reference: "3010-017",
        label: "Jan Kowalski, środa, 2 października 2030, 11:00–11:50",
      }}
    />
  ),
};
