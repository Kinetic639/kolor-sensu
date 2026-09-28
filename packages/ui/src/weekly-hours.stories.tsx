import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect } from "storybook/test";
import { Button } from "./button";
import { WeeklyHoursEditor, type WeeklyHoursDay } from "./weekly-hours";

const meta = {
  title: "Portal/Weekly hours",
  parameters: { controls: { disable: true }, layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const workdays: WeeklyHoursDay[] = Array.from({ length: 7 }, (_, index) => ({
  weekday: index + 1,
  open: index < 5,
  intervals: [{ startsAt: "08:00", endsAt: "18:00" }],
}));

function Editor({
  initial = workdays,
  errors,
}: {
  initial?: WeeklyHoursDay[];
  errors?: Record<string, string>;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="max-w-3xl">
      <WeeklyHoursEditor
        dayActions={() => (
          <Button size="sm" type="button" variant="ghost">
            Kopiuj
          </Button>
        )}
        errors={errors}
        onChange={setValue}
        value={value}
      />
      <p className="mt-3 text-sm" role="status">
        Sobota: {value[5]!.open ? "otwarte" : "zamknięte"}
      </p>
    </div>
  );
}

export const Workdays: Story = {
  render: () => <Editor />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("switch", { name: "sobota otwarte" }),
    );
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Sobota: otwarte",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Dodaj przedział: sobota" }),
    );
    await expect(canvas.getByLabelText("Od, sobota, przedział 2")).toHaveValue(
      "19:00",
    );
  },
};

export const WithLunchBreak: Story = {
  render: () => (
    <Editor
      initial={workdays.map((day) =>
        day.open
          ? {
              ...day,
              intervals: [
                { startsAt: "08:00", endsAt: "12:00" },
                { startsAt: "13:00", endsAt: "18:00" },
              ],
            }
          : day,
      )}
    />
  ),
};

export const WithErrors: Story = {
  render: () => (
    <Editor
      errors={{ "0.0": "Koniec musi być po początku." }}
      initial={workdays.map((day, index) =>
        index === 0
          ? { ...day, intervals: [{ startsAt: "18:00", endsAt: "08:00" }] }
          : day,
      )}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Koniec musi być po początku.",
    );
  },
};
