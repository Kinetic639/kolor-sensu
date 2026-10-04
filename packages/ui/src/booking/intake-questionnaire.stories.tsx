import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { IntakeQuestionnaire } from "./intake-questionnaire";

// The questionnaire before a first consultation, as the booking wizard
// shows it (the public site's theme).

const meta = {
  title: "Booking/Intake questionnaire",
  component: IntakeQuestionnaire,
  parameters: { layout: "padded" },
  args: { onSubmit: async () => undefined },
  decorators: [
    (Story) => (
      <div className="bg-bg max-w-3xl p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IntakeQuestionnaire>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Why it is asked, before it starts. */
export const Start: Story = {};

/** A mood of 0: no booking, the crisis lines instead. */
export const Crisis: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Rozpocznij test" }),
    );
    await userEvent.click(canvas.getByRole("radio", { name: "0" }));
    await expect(
      canvas.getByRole("region", {
        name: "Nie musisz zmagać się z tym samodzielnie",
      }),
    ).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Dalej" })).toBeNull();
  },
};

/** A question with several answers. */
export const Question: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Rozpocznij test" }),
    );
    await userEvent.click(canvas.getByRole("radio", { name: "6" }));
    await userEvent.click(canvas.getByRole("button", { name: "Dalej" }));
    await userEvent.click(canvas.getByRole("checkbox", { name: "Lęk" }));
  },
};
