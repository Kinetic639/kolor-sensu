import type { Meta, StoryObj } from "@storybook/react";
import { Plus } from "lucide-react";
import { expect, userEvent, within } from "storybook/test";
import { Button } from "./button";
import { ResourceList, type ResourceListItem } from "./resource-list";

const meta = {
  title: "Portal/Resource list",
  parameters: { controls: { disable: true } },
  decorators: [
    (Story) => (
      <div className="max-w-5xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const specialists: ResourceListItem[] = [
  {
    id: "anna",
    href: "#anna",
    name: "Anna Kłobuchowska",
    description: "Psychoterapeutka, terapeutka par",
    avatar: {
      url: null,
      initials: "AK",
      accent: "#7c3aed",
      tint: "color-mix(in srgb, #7c3aed 8%, var(--surface))",
    },
    facts: ["4 usługi"],
    statuses: [{ label: "Opublikowany", tone: "success" }],
    tags: ["active"],
  },
  {
    id: "michal",
    href: "#michal",
    name: "Michał Stępień",
    description: "Psycholog",
    avatar: {
      url: null,
      initials: "MS",
      accent: "var(--resource-3)",
      tint: "var(--resource-3-soft)",
    },
    facts: ["1 usługa"],
    statuses: [{ label: "Do weryfikacji", tone: "warning" }],
    tags: ["active", "pending"],
  },
  {
    id: "ewa",
    href: "#ewa",
    name: "Ewa Zielińska",
    description: "Psychoterapeutka dzieci i młodzieży",
    avatar: {
      url: null,
      initials: "EZ",
      accent: "#0891b2",
      tint: "color-mix(in srgb, #0891b2 8%, var(--surface))",
    },
    facts: ["0 usług"],
    statuses: [{ label: "Nieaktywny", tone: "neutral" }],
    tags: ["inactive"],
    muted: true,
  },
];

const rooms: ResourceListItem[] = [
  {
    id: "green",
    href: "#green",
    name: "Gabinet Zielony",
    description: "Siedziba Główna",
    color: "#16a34a",
    facts: ["Pn–Pt 8:00–18:00", "2 osoby"],
    statuses: [
      { label: "Aktywny", tone: "success" },
      { label: "Na stronie", tone: "info" },
    ],
    tags: ["active", "on-site"],
  },
  {
    id: "blue",
    href: "#blue",
    name: "Gabinet Niebieski",
    description: "Siedziba Główna",
    color: "#2563eb",
    facts: ["Bez godzin otwarcia", "1 osoba"],
    statuses: [{ label: "Nieaktywny", tone: "neutral" }],
    tags: ["inactive"],
    muted: true,
  },
];

export const Specialists: Story = {
  render: () => (
    <ResourceList
      allLabel="Wszyscy"
      emptyText="Nie ma jeszcze specjalistów."
      filters={[
        { id: "active", label: "Aktywni" },
        { id: "pending", label: "Do weryfikacji" },
        { id: "inactive", label: "Nieaktywni" },
      ]}
      items={specialists}
      label="Specjaliści"
      noMatchText="Nikt nie pasuje do wyszukiwania i filtra."
      searchLabel="Szukaj specjalisty"
      searchPlaceholder="Szukaj specjalisty…"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("radio", { name: /Do weryfikacji/ }),
    );
    await expect(
      within(canvas.getByRole("list", { name: "Specjaliści" })).getAllByRole(
        "link",
      ),
    ).toHaveLength(1);
  },
};

export const Rooms: Story = {
  render: () => (
    <ResourceList
      actions={
        <Button size="sm">
          <Plus aria-hidden="true" className="size-4" />
          Dodaj gabinet
        </Button>
      }
      emptyText="Nie ma jeszcze gabinetów."
      filters={[
        { id: "active", label: "Aktywne" },
        { id: "inactive", label: "Nieaktywne" },
        { id: "on-site", label: "Na stronie" },
      ]}
      items={rooms}
      label="Gabinety"
      noMatchText="Żaden gabinet nie pasuje do wyszukiwania i filtra."
      searchLabel="Szukaj gabinetu"
      searchPlaceholder="Szukaj gabinetu…"
    />
  ),
};

export const NoMatch: Story = {
  render: Specialists.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole("searchbox"), "xyz");
    await expect(
      await canvas.findByRole("button", {
        name: "Wyczyść wyszukiwanie i filtry",
      }),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  render: () => (
    <ResourceList
      emptyText="Nie ma jeszcze gabinetów."
      items={[]}
      label="Gabinety"
      noMatchText=""
      searchLabel="Szukaj gabinetu"
    />
  ),
};
