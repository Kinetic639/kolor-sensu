import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn, screen } from "storybook/test";
import { Button } from "./button";
import { RecurrenceScopeDialog, WeekdayPicker } from "./recurrence";

const meta = {
  title: "Portal/Recurrence",
  parameters: { controls: { disable: true } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function PickerDemo() {
  const [days, setDays] = useState([1, 3, 5]);
  return (
    <div className="grid gap-2">
      <WeekdayPicker label="Powtarzaj w" onChange={setDays} value={days} />
      <p className="text-sm" role="status">
        Wybrane: {days.join(", ")}
      </p>
    </div>
  );
}

export const Weekdays: Story = {
  render: () => <PickerDemo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "wtorek" }));
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Wybrane: 1, 2, 3, 5",
    );
    await expect(
      canvas.getByRole("button", { name: "wtorek" }),
    ).toHaveAttribute("aria-pressed", "true");
  },
};

const onConfirm = fn();

function ScopeDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="destructive">
        Usuń termin
      </Button>
      <RecurrenceScopeDialog
        confirmLabel="Usuń"
        description="Ten termin jest częścią reguły „Co tydzień w dni robocze (pn–pt)”."
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={(scope) => {
          onConfirm(scope);
          setOpen(false);
        }}
        open={open}
        title="Usunąć termin cykliczny?"
      />
    </>
  );
}

export const ScopeDialog: Story = {
  render: () => <ScopeDemo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Usuń termin" }));
    // The dialog renders in a portal, outside the story's canvas.
    await expect(
      await screen.findByRole("radio", { name: "Tylko ten termin" }),
    ).toBeChecked();
    await userEvent.click(
      screen.getByRole("radio", { name: "Ten i następne terminy" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Usuń" }));
    await expect(onConfirm).toHaveBeenCalledWith("following");
  },
};
