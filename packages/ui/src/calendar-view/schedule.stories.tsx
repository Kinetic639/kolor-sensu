import type { Meta, StoryObj } from "@storybook/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { expect, userEvent, within } from "storybook/test";
import { AvailabilityPanel } from "./availability-panel";
import { ScheduleAgenda, WeekAgenda } from "./schedule-agenda";
import { ScheduleCanvas } from "./schedule-controls";
import {
  annaWeek,
  people,
  roomsDay,
  roomsWeek,
  specialistsDay,
  specialistsWeek,
} from "./schedule.samples";
import {
  ComparisonSummaryPanel,
  PersonalSummaryPanel,
} from "./schedule-summary";
import { ScheduleToolbar, type SegmentLink } from "./schedule-toolbar";
import { DaySchedule, ScheduleFrame, WeekComparison } from "./schedule-views";

// The calendar as the portals show it, after the AI Studio reference
// (docs/design/references): the centre's day by specialist or room, the
// week compared, a specialist's own week. Availability is the calm
// background in its room's colour, visits the cards over it.

const visitHref = (id: string) => `?wizyta=${id}`;
const collapseHref = (key: string) => `?zwiniete=${key}`;
const availabilityHref = (key: string) => `?okno=${key}`;

const segments = (labels: string[], active: number): SegmentLink[] =>
  labels.map((label, index) => ({
    key: label,
    label,
    href: `?${index}`,
    active: index === active,
  }));

type Kind =
  | "day-specialists"
  | "day-rooms"
  | "week-specialists"
  | "week-rooms"
  | "personal";

function Calendar({
  kind,
  query = "",
  collapsed = [],
  open,
  window = false,
}: {
  kind: Kind;
  query?: string;
  collapsed?: string[];
  open?: string;
  /** The first specialist's first window open in the side panel. */
  window?: boolean;
}) {
  const week = kind.startsWith("week") || kind === "personal";
  const byRoom = kind.endsWith("rooms");
  const personal = kind === "personal";
  return (
    <NuqsTestingAdapter searchParams={query}>
      <ScheduleCanvas className="max-w-[90rem] space-y-4">
        <ScheduleToolbar
          locations={
            personal
              ? undefined
              : [
                  { value: "mokotowska", label: "Warszawa · Mokotowska 46" },
                  { value: "online", label: "Online / Zdalnie" },
                ]
          }
          nav={{
            unit: week ? "tydzień" : "dzień",
            label: week
              ? "30 września – 6 października 2030"
              : "Śr, 2 paź 2030",
            previousHref: "?p",
            nextHref: "?n",
            todayHref: "?",
            isCurrent: true,
          }}
          perspectives={
            personal
              ? undefined
              : segments(["Specjaliści", "Gabinety"], byRoom ? 1 : 0)
          }
          switches={
            week
              ? ["puste", "wyszarz", "wizyty", "dostepnosc", "podsumowanie"]
              : personal
                ? ["puste", "wyszarz", "wizyty", "dostepnosc", "podsumowanie"]
                : ["puste", "wyszarz", "wizyty", "dostepnosc"]
          }
          views={segments(["Dzień", "Tydzień"], week ? 1 : 0)}
        />
        <ScheduleFrame
          aside={
            window ? null : personal ? (
              <PersonalSummaryPanel
                availabilityHref="/dostepnosc"
                name={people[0]!.name}
                subtitle={people[0]!.title}
                summary={annaWeek.summary}
                visitHref={visitHref}
              />
            ) : week ? (
              <ComparisonSummaryPanel
                byRoom={byRoom}
                period="Tydzień 30 wrz – 6 paź"
                summary={(byRoom ? roomsWeek : specialistsWeek).summary}
              />
            ) : null
          }
          desktop={
            kind === "personal" ? (
              <DaySchedule
                ariaLabel="Mój tydzień"
                availabilityHref={availabilityHref}
                mode="personal"
                openVisitId={open}
                view={annaWeek}
                visitHref={visitHref}
              />
            ) : week ? (
              <WeekComparison
                ariaLabel="Porównanie tygodnia"
                availabilityHref={availabilityHref}
                byRoom={byRoom}
                openVisitId={open}
                view={byRoom ? roomsWeek : specialistsWeek}
                visitHref={visitHref}
              />
            ) : (
              <DaySchedule
                ariaLabel="Kalendarz dnia"
                availabilityHref={availabilityHref}
                collapseHref={collapseHref}
                collapsed={collapsed}
                mode={byRoom ? "rooms" : "specialists"}
                openVisitId={open}
                view={byRoom ? roomsDay : specialistsDay}
                visitHref={visitHref}
              />
            )
          }
          mobile={
            kind === "personal" ? (
              <ScheduleAgenda
                ariaLabel="Mój tydzień"
                columns={annaWeek.columns}
                visitHref={visitHref}
              />
            ) : week ? (
              <WeekAgenda
                ariaLabel="Porównanie tygodnia"
                byRoom={byRoom}
                dayHref={(date) => `?data=${date}`}
                selected="2030-10-02"
                view={byRoom ? roomsWeek : specialistsWeek}
                visitHref={visitHref}
              />
            ) : (
              <ScheduleAgenda
                ariaLabel="Kalendarz dnia"
                availabilityHref={availabilityHref}
                byRoom={byRoom}
                columns={(byRoom ? roomsDay : specialistsDay).columns}
                visitHref={visitHref}
              />
            )
          }
          panel={
            window ? (
              <AvailabilityPanel
                closeHref="?"
                column={specialistsDay.columns[0]!}
                dateLabel="środa, 2 października 2030"
                manage={{
                  href: "/specjalisci/anna",
                  label: "Profil specjalisty",
                }}
                slot={specialistsDay.columns[0]!.availability[0]!}
                visitHref={visitHref}
              />
            ) : null
          }
        />
      </ScheduleCanvas>
    </NuqsTestingAdapter>
  );
}

const meta = {
  title: "Portal/Schedule",
  component: Calendar,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DayBySpecialist: Story = {
  args: { kind: "day-specialists" },
  play: async ({ canvas }) => {
    const anna = canvas.getByRole("group", { name: /^Anna Nowak/ });
    await expect(anna).toHaveAccessibleName(
      /08:00 – 18:00, 5 wizyt, obłożenie/,
    );
    await expect(
      within(anna).getByRole("link", { name: /^Ewa Kowalska/ }),
    ).toHaveAttribute("href", "?wizyta=d2-1");
    await expect(
      canvas.getByRole("group", { name: /^Karolina Adamczyk/ }),
    ).toHaveAccessibleName(/brak dostępności/);
  },
};

export const DayByRoom: Story = {
  args: { kind: "day-rooms" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("group", { name: /^Gabinet 5, zamknięty: Remont/ }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("group", { name: /^Online/ }),
    ).toBeInTheDocument();
  },
};

export const CollapsedColumn: Story = {
  args: { kind: "day-specialists", collapsed: ["katarzyna"] },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", {
        name: "Rozwiń kolumnę: Katarzyna Wiśniewska",
      }),
    ).toHaveAttribute("href", "?zwiniete=katarzyna");
  },
};

export const WeekOfSpecialists: Story = {
  args: { kind: "week-specialists" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("complementary", { name: "Porównanie specjalistów" }),
    ).toBeInTheDocument();
    await expect(canvas.getAllByRole("group", { name: /^Śr, 2/ })).toHaveLength(
      1,
    );
  },
};

export const WeekOfRooms: Story = {
  args: { kind: "week-rooms" },
};

export const SpecialistWeek: Story = {
  args: { kind: "personal" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("complementary", { name: "Anna Nowak" }),
    ).toBeInTheDocument();
  },
};

export const SearchAndSelection: Story = {
  args: { kind: "day-specialists", open: "d2-2" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: /^Piotr Wiśniewski/ }),
    ).toHaveAttribute("aria-current", "true");
  },
};

export const HiddenVisits: Story = {
  args: { kind: "week-specialists" },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole("switch", { name: "Wizyty" }));
    await expect(
      canvasElement.querySelector("[data-hide-visits]"),
    ).not.toBeNull();
  },
};

export const PhoneDay: Story = {
  args: { kind: "day-specialists" },
  globals: { viewport: { value: "mobile", isRotated: false } },
};

export const PhoneWeek: Story = {
  args: { kind: "week-specialists" },
  globals: { viewport: { value: "mobile", isRotated: false } },
};

export const AvailabilityOpen: Story = {
  args: { kind: "day-specialists", window: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("complementary", { name: "Gabinet 1" }),
    ).toHaveTextContent("Wizyty w tym oknie");
  },
};
