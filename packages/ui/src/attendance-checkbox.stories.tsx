import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { AttendanceCheckbox } from "./attendance-checkbox";

const meta = {
  title: "Forms/Attendance",
  component: AttendanceCheckbox,
  parameters: { layout: "padded" },
  args: {
    attended: false,
    name: "Ola Nowak",
    onSave: () =>
      new Promise<boolean>((done) => setTimeout(() => done(true), 800)),
  },
} satisfies Meta<typeof AttendanceCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Not yet marked; a click shows at once while it saves. */
export const NotMarked: Story = {
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole("checkbox", {
      name: "Ola Nowak: był(a)",
    });
    await userEvent.click(box);
    await expect(box).toBeChecked();
  },
};

/** Marked as there. */
export const Came: Story = { args: { attended: true } };

/** The save fails: the box goes back. */
export const SaveFails: Story = {
  args: {
    onSave: () =>
      new Promise<boolean>((done) => setTimeout(() => done(false), 300)),
  },
};
