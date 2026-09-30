import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { CalendarLegend, CalendarToolbar } from "./calendar-toolbar";
import { annaWeek, roomsDay, specialistsDay } from "./calendar-view.samples";
import { ResourceCalendar } from "./resource-calendar";

// The calendar views as the portals show them (reference: the AI Studio
// prototype, docs/design/references): the centre's day by specialist or
// room, one person's week. Availability is the calm background, visits
// the cards over it; the red line is now.

const visitHref = (id: string) => `?wizyta=${id}`;

function Calendar({
  view,
  week = false,
  rooms = false,
  open,
}: {
  view: typeof specialistsDay;
  week?: boolean;
  rooms?: boolean;
  open?: string;
}) {
  return (
    <div className="grid max-w-6xl gap-3">
      <CalendarToolbar
        nav={{
          unit: week ? "tydzień" : "dzień",
          label: week ? "30 wrz – 6 paź 2030" : "środa, 2 października 2030",
          previousHref: "?data=2030-10-01",
          nextHref: "?data=2030-10-03",
          todayHref: null,
        }}
        perspectives={[
          { key: "s", label: "Specjaliści", href: "?", active: !rooms },
          { key: "g", label: "Gabinety", href: "?p=g", active: rooms },
        ]}
        resources={
          week
            ? [
                {
                  key: "anna",
                  label: "Anna Kłobuchowska",
                  href: "?zasob=anna",
                  active: true,
                  color: "#5f9e8f",
                },
                {
                  key: "michal",
                  label: "Michał Stępień",
                  href: "?zasob=michal",
                  active: false,
                  color: null,
                },
              ]
            : undefined
        }
        views={[
          { key: "d", label: "Dzień", href: "?", active: !week },
          { key: "t", label: "Tydzień", href: "?w=t", active: week },
        ]}
      />
      <ResourceCalendar
        ariaLabel="Kalendarz"
        openVisitId={open}
        view={view}
        visitHref={visitHref}
      />
      <CalendarLegend />
    </div>
  );
}

const meta = {
  title: "Portal/Calendar views",
  component: Calendar,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DayBySpecialist: Story = {
  name: "Dzień: specjaliści",
  args: { view: specialistsDay },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("group", { name: /^Anna Kłobuchowska/ }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: /^Jan Kowalski/ }),
    ).toHaveAttribute("href", "?wizyta=v1");
    await expect(canvas.getByText("Brak dostępności")).toBeInTheDocument();
  },
};

export const DayByRoom: Story = {
  name: "Dzień: gabinety",
  args: { view: roomsDay, rooms: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("group", { name: /^Online/ }),
    ).toBeInTheDocument();
  },
};

export const SpecialistWeek: Story = {
  name: "Tydzień specjalisty",
  args: { view: annaWeek, week: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Śr").closest("[aria-current]"),
    ).toHaveAttribute("aria-current", "date");
  },
};

export const OpenVisit: Story = {
  name: "Otwarta wizyta",
  args: { view: specialistsDay, open: "v2" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: /^Maria i Piotr Nowak/ }),
    ).toHaveAttribute("aria-current", "true");
  },
};

export const Empty: Story = {
  name: "Brak kolumn",
  args: { view: { ...specialistsDay, columns: [] } },
};
