import type { Meta, StoryObj } from "@storybook/react";
import { Building2, Calendar, RotateCw, Video } from "lucide-react";
import { useState } from "react";
import { expect } from "storybook/test";
import { ChoiceCardGroup } from "./choice-card";
import { LinkTabs } from "./link-tabs";

const meta = {
  title: "Portal/Navigation and choices",
  parameters: { controls: { disable: true } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ViewTabs: Story = {
  render: () => (
    <LinkTabs
      ariaLabel="Widok dostępności"
      items={[
        {
          key: "calendar",
          label: "Widok kalendarza",
          href: "?widok=kalendarz",
          active: true,
          icon: (
            <Calendar
              aria-hidden="true"
              className="size-4 text-[var(--primary)]"
            />
          ),
          badge: "Podstawowy",
        },
        {
          key: "rules",
          label: "Reguły i bloki",
          href: "?widok=reguly",
          icon: (
            <RotateCw
              aria-hidden="true"
              className="size-4 text-[var(--primary)]"
            />
          ),
          badge: "4 reguły",
        },
      ]}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: /Widok kalendarza/ }),
    ).toHaveAttribute("aria-current", "page");
  },
};

export const FilterChips: Story = {
  render: () => (
    <LinkTabs
      ariaLabel="Filtruj dni"
      items={[
        { key: "all", label: "Wszystkie", href: "?", active: true, badge: 4 },
        { key: "1", label: "Pon", href: "?dzien=1", badge: 2 },
        { key: "2", label: "Wt", href: "?dzien=2" },
        { key: "3", label: "Śr", href: "?dzien=3", badge: 1 },
        { key: "4", label: "Czw", href: "?dzien=4", badge: 1 },
      ]}
      variant="chips"
    />
  ),
};

function ModeChoice() {
  const [value, setValue] = useState<"in_person" | "online" | "hybrid">(
    "in_person",
  );
  return (
    <div className="max-w-md">
      <ChoiceCardGroup
        legend="Forma pracy"
        name="mode"
        onChange={setValue}
        options={[
          {
            value: "in_person",
            label: "Stacjonarnie",
            icon: <Building2 className="size-4" />,
          },
          {
            value: "online",
            label: "Online",
            icon: <Video className="size-4" />,
          },
          {
            value: "hybrid",
            label: "Hybrydowo",
            icon: <RotateCw className="size-4" />,
          },
        ]}
        value={value}
      />
    </div>
  );
}

export const ChoiceCards: Story = {
  render: () => <ModeChoice />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Online" }));
    await expect(canvas.getByRole("radio", { name: "Online" })).toBeChecked();
    await expect(
      canvas.getByRole("radio", { name: "Stacjonarnie" }),
    ).not.toBeChecked();
  },
};

export const RoomList: Story = {
  render: () => (
    <div className="max-w-md">
      <ChoiceCardGroup
        layout="list"
        legend="Gabinet"
        name="room"
        onChange={() => {}}
        options={[
          {
            value: "1",
            label: "Gabinet 1",
            description: "Mokotowska 46 · 3 os.",
            accent: "var(--resource-1)",
          },
          {
            value: "2",
            label: "Gabinet 2",
            description: "Mokotowska 46 · 4 os.",
            accent: "var(--resource-2)",
          },
          {
            value: "3",
            label: "Gabinet 3",
            description: "Mokotowska 46 · 2 os.",
            accent: "var(--resource-3)",
          },
        ]}
        value="2"
      />
    </div>
  ),
};
