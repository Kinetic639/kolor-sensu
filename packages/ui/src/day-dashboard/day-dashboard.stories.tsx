import {
  dayNav,
  dayTimeline,
  weekSummary,
  weekVisitsByDay,
  type VisitLike,
} from "@repo/scheduling";
import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import { expect, userEvent, within } from "storybook/test";
import { DayStrip } from "./day-strip";
import { DayAgenda, DayTimelineView } from "./day-timeline";
import { TaskList } from "./task-list";
import { WeekFigures } from "./week-figures";

// The admin's dashboard on an example Friday (9 October, 11:20): eight
// visits of two people in two rooms and online, a refund to make, a
// reservation to be paid by 13:00.

const now = new Date("2026-10-09T09:20:00Z");
const anna = { id: "anna", name: "Anna Kłobuchowska", color: "#c26a12" };
const michal = { id: "michal", name: "Michał Stępień", color: "#6b45c9" };
const green = { id: "green", name: "Gabinet Zielony", color: "#1e9e57" };
const blue = { id: "blue", name: "Gabinet Niebieski", color: "#2563d9" };

const visit = (
  start: string,
  end: string,
  client: string,
  specialist: typeof anna,
  room: typeof green | null,
  over: Partial<VisitLike> = {},
): VisitLike => ({
  id: `visit-${start}`,
  reference: `2610-0${start.slice(0, 2)}`,
  status: "confirmed",
  mode: room ? "in_person" : "online",
  startsAt: `2026-10-09T${start}:00+02:00`,
  endsAt: `2026-10-09T${end}:00+02:00`,
  serviceName: "Konsultacja psychologiczna",
  specialist,
  room,
  locationName: null,
  client: { name: client, email: null, phone: null, notes: null },
  priceMinor: 22000,
  currencyCode: "PLN",
  payment: { paid: true, refundDueMinor: null, refundedMinor: 0 },
  cancelledBy: null,
  rescheduleCount: 0,
  ...over,
});

const visits = [
  visit("08:00", "08:50", "Ewa Nowak", anna, green),
  visit("09:00", "09:50", "Jan Kowalski", michal, null),
  visit("10:00", "10:50", "Marta Wiśniewska", anna, blue, {
    serviceName: "Terapia dla par",
  }),
  visit("11:00", "11:50", "Piotr Zieliński", michal, green),
  visit("12:00", "12:50", "Katarzyna Lewandowska", anna, null),
  visit("14:00", "14:50", "Tomasz Dąbrowski", michal, green, {
    status: "awaiting_payment",
    paymentDueAt: "2026-10-09T13:00:00+02:00",
    payment: { paid: false, refundDueMinor: null, refundedMinor: 0 },
  }),
  visit("15:30", "16:20", "Agnieszka Kamińska", anna, blue, {
    serviceName: "Terapia dla par",
  }),
  visit("17:00", "17:50", "Paweł Szymański", michal, null),
];

const options = {
  timeZone: "Europe/Warsaw",
  now,
  rooms: [green, blue],
  specialists: [anna, michal],
};

const panel =
  "min-w-0 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface)]";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={panel}>
      <h2 className="flex h-9 items-center border-b border-[var(--border)] px-3 text-[0.8125rem] font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Dashboard({
  empty = false,
  view = "gabinety",
}: {
  empty?: boolean;
  view?: "gabinety" | "specjalisci";
}) {
  const day = dayTimeline(empty ? [] : visits, options);
  const nav = dayNav("2026-10-09", "2026-10-09");
  return (
    <div className="flex flex-col gap-2 bg-[var(--surface-subtle)] p-2 sm:gap-3 sm:p-3">
      <div className={panel}>
        <DayStrip
          items={[
            {
              id: "today",
              label: "Dziś",
              value: empty ? "0" : "8",
              detail: "wizyt · 1 czeka",
              href: "/rezerwacje?zakres=dzis",
            },
            {
              id: "awaiting",
              label: "Czeka na płatność",
              value: "1",
              detail: "najbliższa do 09.10, 13:00",
              tone: "warning",
              href: "/rezerwacje?status=oczekujace",
            },
            {
              id: "owed",
              label: "Do rozliczenia",
              value: "240 zł",
              detail: "1 do zwrotu",
              tone: "danger",
              href: "/rezerwacje?platnosc=do-zwrotu",
            },
            {
              id: "week",
              label: "Ten tydzień",
              value: "31",
              detail: "wizyt · 6 840 zł",
              href: "/rezerwacje?zakres=ten-tydzien",
            },
          ]}
        />
      </div>
      <div className={`${panel} hidden md:block`}>
        <DayTimelineView day={day} nav={nav} view={view} />
      </div>
      <div className="grid items-start gap-2 sm:gap-3 md:grid-cols-2">
        <div className={panel}>
          <DayAgenda day={day} nav={nav} />
        </div>
        <Section title="Do zrobienia">
          <TaskList
            items={
              empty
                ? []
                : [
                    {
                      id: "refund",
                      title: "Zwrot nie doszedł do skutku · 240 zł",
                      detail:
                        "Ewa Nowak · 2610-014 · pt. 02.10, 10:00 · od 02.10",
                      tone: "danger",
                      href: "/rezerwacje?zakres=wszystkie&q=2610-014&wizyta=refund",
                      target: "Rezerwacja",
                    },
                    {
                      id: "pay",
                      title: "Płatność do 13:00",
                      detail: "2610-031 · Tomasz Dąbrowski · 09.10, 14:00",
                      tone: "warning",
                      href: "/rezerwacje?zakres=wszystkie&q=2610-031&wizyta=pay",
                      target: "Rezerwacja",
                    },
                    {
                      id: "draft",
                      title: "Profil do weryfikacji",
                      detail: "Anna Kłobuchowska · wysłany 08.10",
                      tone: "info",
                      href: "/specjalisci/anna",
                      target: "Specjalista",
                    },
                  ]
            }
          />
        </Section>
      </div>
      <Section title="Ten tydzień">
        <WeekFigures
          days={weekVisitsByDay(empty ? [] : visits, {
            timeZone: "Europe/Warsaw",
            now,
            week: "2026-10-05",
          })}
          figures={weekSummary(visits, visits.slice(0, 5))}
        />
      </Section>
    </div>
  );
}

const meta = {
  title: "Portal/Admin dashboard",
  component: Dashboard,
  parameters: {
    controls: { disable: true },
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof Dashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A working Friday by room: who is where, now at 11:20. */
export const ByRoom: Story = {
  play: async ({ canvas }) => {
    const rooms = canvas.getByRole("list", { name: "Dzień w gabinetach" });
    await expect(
      within(rooms).getByRole("link", {
        name: "Piotr Zieliński, 11:00–11:50, Gabinet Zielony, Trwa",
      }),
    ).toBeVisible();
  },
};

/** The same day by person, switched in place. */
export const ByPerson: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Specjaliści" }));
    await expect(
      canvas.getByRole("list", { name: "Dzień zespołu" }),
    ).toBeVisible();
  },
};

/** A day with nothing booked and nothing to do. */
export const Quiet: Story = {
  args: { empty: true },
};

/** On a phone: the figures scroll, the day is only its list. */
export const Phone: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
