import type { Meta, StoryObj } from "@storybook/react";
import { COLOR_PALETTE } from "@repo/contracts/colors";
import { useState } from "react";
import { expect } from "storybook/test";
import { ColorField, ColorPalette, ColorSwatch } from "./color-field";

const meta = {
  title: "Forms/Color",
  parameters: { controls: { disable: true }, layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Dots for lists and legends, in the ready colours. */
export const Swatches: Story = {
  render: () => (
    <ul className="grid gap-2 sm:grid-cols-3">
      {COLOR_PALETTE.map((color) => (
        <li className="flex items-center gap-2 text-sm" key={color.value}>
          <ColorSwatch color={color.value} />
          {color.label}
          <code className="text-xs text-[var(--text-muted)]">
            {color.value}
          </code>
        </li>
      ))}
    </ul>
  ),
};

function PaletteDemo() {
  const [value, setValue] = useState<string | null>("#16a34a");
  return (
    <div className="grid max-w-md gap-3">
      <ColorPalette label="Kolor" onChange={setValue} value={value} />
      <p className="text-sm" role="status">
        Wybrano: {value}
      </p>
    </div>
  );
}

export const Palette: Story = {
  render: () => <PaletteDemo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Chaber" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("#2563eb");
  },
};

function FieldDemo({ initial }: { initial: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <div className="grid max-w-xl gap-3">
      <ColorField
        automaticColor="var(--resource-2)"
        description="Wyróżnia gabinet w grafikach i na listach."
        label="Kolor gabinetu"
        onChange={setValue}
        value={value}
      />
      <p className="text-sm" role="status">
        Zapisze się: {value ?? "automatycznie"}
      </p>
    </div>
  );
}

/** Automatic until a colour is chosen; then back to automatic. */
export const Automatic: Story = {
  render: () => <FieldDemo initial={null} />,
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole("radio", { name: /Automatycznie/ }),
    ).toBeChecked();
    await userEvent.click(canvas.getByRole("radio", { name: "Róż" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("#db2777");
    await userEvent.click(canvas.getByRole("radio", { name: /Automatycznie/ }));
    await expect(canvas.getByRole("status")).toHaveTextContent("automatycznie");
  },
};

/** Any colour: typed by hand (or from the system picker). */
export const CustomColor: Story = {
  render: () => <FieldDemo initial={null} />,
  play: async ({ canvas, userEvent }) => {
    const code = canvas.getByLabelText("Kod koloru");
    await userEvent.type(code, "#1A7F5A");
    await expect(canvas.getByRole("status")).toHaveTextContent("#1a7f5a");
  },
};

/** Too light to see on white: the field says so. */
export const LowContrast: Story = {
  render: () => <FieldDemo initial="#fde68a" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(/słabo widoczny/);
  },
};
