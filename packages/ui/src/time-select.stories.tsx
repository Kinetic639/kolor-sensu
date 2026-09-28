import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect } from "storybook/test";
import { Label } from "./label";
import { TimeSelect } from "./time-select";

const meta = {
  title: "Primitives/Time select",
  parameters: { controls: { disable: true }, layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [value, setValue] = useState("08:00");
  return (
    <div className="grid max-w-40 gap-1.5">
      <Label htmlFor="time">Od</Label>
      <TimeSelect id="time" onChange={setValue} value={value} />
      <p className="text-sm" role="status">
        Wybrano: {value}
      </p>
    </div>
  );
}

/** 24-hour times every 15 minutes, whatever the browser's language. */
export const Default: Story = {
  render: () => <Demo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.selectOptions(
      canvas.getByRole("combobox", { name: "Od" }),
      "13:45",
    );
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Wybrano: 13:45",
    );
  },
};
