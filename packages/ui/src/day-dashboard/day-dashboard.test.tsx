import {
  dayTimeline,
  weekVisitsByDay,
  weekSummary,
  type VisitLike,
} from "@repo/scheduling";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { dayNav } from "@repo/scheduling";
import { describe, expect, it, vi } from "vitest";
import { DayStrip } from "./day-strip";
import { DayAgenda, DayTimelineView } from "./day-timeline";
import { TaskList } from "./task-list";
import { WeekFigures } from "./week-figures";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const now = new Date("2026-10-09T09:20:00Z");
const anna = { id: "anna", name: "Anna Kłobuchowska", color: "#c26a12" };
const green = { id: "green", name: "Gabinet Zielony", color: "#1e9e57" };

const visit = (
  start: string,
  client: string,
  over: Partial<VisitLike> = {},
): VisitLike => ({
  id: `v-${start}`,
  reference: `2610-${start.replace(":", "")}`,
  status: "confirmed",
  mode: "in_person",
  startsAt: `2026-10-09T${start}:00+02:00`,
  endsAt: `2026-10-09T${start.slice(0, 2)}:50:00+02:00`,
  serviceName: "Konsultacja psychologiczna",
  specialist: anna,
  room: green,
  locationName: null,
  client: { name: client, email: null, phone: null, notes: null },
  priceMinor: 20000,
  currencyCode: "PLN",
  payment: { paid: true, refundDueMinor: null, refundedMinor: 0 },
  cancelledBy: null,
  rescheduleCount: 0,
  ...over,
});

const day = dayTimeline(
  [
    visit("08:00", "Ewa Nowak"),
    visit("11:00", "Piotr Zieliński"),
    visit("12:00", "Katarzyna Lewandowska", { mode: "online", room: null }),
  ],
  { timeZone: "Europe/Warsaw", now, rooms: [green], specialists: [anna] },
);

describe("DayStrip", () => {
  it("each figure leads to its bookings", () => {
    render(
      <DayStrip
        items={[
          {
            id: "today",
            label: "Dziś",
            value: "8",
            detail: "wizyt",
            href: "/rezerwacje?zakres=dzis",
          },
          {
            id: "owed",
            label: "Do rozliczenia",
            value: "240 zł",
            tone: "danger",
            href: "/rezerwacje?platnosc=do-zwrotu",
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("link", { name: /Dziś\s*8\s*wizyt/ }),
    ).toHaveAttribute("href", "/rezerwacje?zakres=dzis");
    expect(
      screen.getByRole("link", { name: /Do rozliczenia\s*240 zł/ }),
    ).toBeInTheDocument();
  });
});

describe("DayTimelineView", () => {
  it("the day by rooms: a card per booking, in its specialist's colour", () => {
    render(<DayTimelineView day={day} />);
    const rooms = screen.getByRole("list", { name: "Dzień w gabinetach" });
    expect(within(rooms).getByText("Gabinet Zielony")).toBeInTheDocument();
    expect(within(rooms).getByText("Online")).toBeInTheDocument();
    const card = within(rooms).getByRole("link", {
      name: "Piotr Zieliński, 11:00–11:50, Gabinet Zielony, Trwa",
    });
    expect(card).toHaveAttribute(
      "href",
      "/rezerwacje?zakres=wszystkie&q=2610-1100&wizyta=v-11%3A00",
    );
    // The card shows the specialist and the hour, not the client.
    expect(card).toHaveTextContent("11:00");
    expect(card).not.toHaveTextContent("Piotr");
  });

  it("switches to the team in place, and back", async () => {
    render(<DayTimelineView day={day} />);
    expect(screen.queryByRole("list", { name: "Dzień zespołu" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Specjaliści" }));
    const people = screen.getByRole("list", { name: "Dzień zespołu" });
    expect(within(people).getByText("Anna Kłobuchowska")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Specjaliści" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(window.location.search).toContain("os=specjalisci");
    await userEvent.click(screen.getByRole("button", { name: "Gabinety" }));
    expect(
      screen.getByRole("list", { name: "Dzień w gabinetach" }),
    ).toBeVisible();
  });

  it("a card holds the time after its visit too, marked as such", () => {
    const held = dayTimeline(
      [
        visit("08:00", "Ewa Nowak", {
          heldUntil: "2026-10-09T09:00:00+02:00",
        }),
      ],
      { timeZone: "Europe/Warsaw", now, rooms: [green], specialists: [anna] },
    );
    render(<DayTimelineView day={held} />);
    const card = screen.getByRole("link", { name: /Ewa Nowak/ });
    const [shown] = held.rooms[0]!.cards;
    expect(card.style.width).toBe(`${shown!.heldWidth}%`);
    expect(shown!.heldWidth).toBeGreaterThan(shown!.width);
  });

  it("a booking's details on hover", async () => {
    render(<DayTimelineView day={day} />);
    await userEvent.hover(screen.getByRole("link", { name: /^Ewa Nowak/ }));
    const tip = await screen.findByRole("tooltip");
    expect(tip).toHaveTextContent("2610-0800");
    expect(tip).toHaveTextContent("Konsultacja psychologiczna");
    expect(tip).toHaveTextContent("Anna Kłobuchowska");
  });

  it("goes a day back or on, and back to today, keeping the lanes", async () => {
    window.history.replaceState(null, "", "/?os=specjalisci");
    render(
      <DayTimelineView day={day} nav={dayNav("2026-10-09", "2026-10-09")} />,
    );
    const [days] = screen.getAllByRole("navigation", { name: "Dzień" });
    expect(within(days!).getByText("9 października")).toBeInTheDocument();
    expect(
      within(days!).getByRole("link", { name: "Następny dzień" }),
    ).toHaveAttribute("href", "/?os=specjalisci&dzien=2026-10-10");
    expect(
      within(days!).getByRole("link", { name: "Poprzedni dzień" }),
    ).toHaveAttribute("href", "/?os=specjalisci&dzien=2026-10-08");
    expect(within(days!).getByRole("link", { name: "Dziś" })).toHaveAttribute(
      "aria-current",
      "date",
    );
    window.history.replaceState(null, "", "/");
  });
});

describe("DayAgenda", () => {
  it("the day's plan as a list, by the hour", () => {
    render(<DayAgenda day={day} />);
    expect(
      screen.getByRole("heading", { name: "Plan dnia" }),
    ).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Plan dnia" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent?.slice(0, 5))).toEqual([
      "08:00",
      "11:00",
      "12:00",
    ]);
    // Who leads it, where, for how much, its number and state; not the
    // client.
    const [first] = rows;
    expect(first).toHaveTextContent("Anna Kłobuchowska");
    expect(first).toHaveTextContent("Gabinet Zielony");
    expect(first).toHaveTextContent(/200\szł/);
    expect(first).toHaveTextContent("2610-0800");
    expect(first).not.toHaveTextContent("Ewa Nowak");
    expect(within(rows[2]!).getByText("Online")).toBeInTheDocument();
    // One way to the booking: its icon button.
    expect(within(first!).getAllByRole("link")).toHaveLength(1);
    expect(
      within(first!).getByRole("link", {
        name: "Szczegóły rezerwacji 2610-0800",
      }),
    ).toHaveAttribute(
      "href",
      "/rezerwacje?zakres=wszystkie&q=2610-0800&wizyta=v-08%3A00",
    );
  });

  it("a day without visits says so in a line", () => {
    render(
      <DayAgenda
        day={dayTimeline([], {
          timeZone: "Europe/Warsaw",
          now,
          rooms: [green],
          specialists: [anna],
        })}
      />,
    );
    expect(screen.getByText("Dziś bez wizyt.")).toBeInTheDocument();
  });
});

describe("TaskList and WeekFigures", () => {
  it("what needs doing, each leading to where it is done; nothing: a line", () => {
    const { rerender } = render(
      <TaskList
        items={[
          {
            id: "pay",
            title: "Płatność do 13:00",
            detail: "2610-031 · Tomasz Dąbrowski · 14:00",
            tone: "warning",
            href: "/rezerwacje?zakres=wszystkie&q=2610-031&wizyta=v1",
            target: "Rezerwacja",
          },
        ]}
      />,
    );
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("Płatność do 13:00");
    // Nothing is done from here: no buttons, one way to the booking.
    expect(within(item).queryByRole("button")).toBeNull();
    expect(within(item).getAllByRole("link")).toHaveLength(1);
    expect(
      within(item).getByRole("link", {
        name: "Rezerwacja: Płatność do 13:00",
      }),
    ).toHaveAttribute(
      "href",
      "/rezerwacje?zakres=wszystkie&q=2610-031&wizyta=v1",
    );
    rerender(<TaskList items={[]} />);
    expect(
      screen.getByText("Nic nie czeka. Wszystko załatwione."),
    ).toBeInTheDocument();
  });

  it("the week against the last", () => {
    render(<WeekFigures figures={weekSummary([visit("08:00", "Ewa")], [])} />);
    expect(screen.getByText("Wizyty").closest("div")).toHaveTextContent("1+1");
  });

  it("the week's visits day by day, in bars", () => {
    const visits = [visit("08:00", "Ewa"), visit("11:00", "Piotr")];
    render(
      <WeekFigures
        days={weekVisitsByDay(visits, {
          timeZone: "Europe/Warsaw",
          now,
          week: "2026-10-05",
        })}
        figures={weekSummary(visits, [])}
      />,
    );
    expect(
      screen.getByRole("img", {
        name: "Wizyty w dniach tygodnia: Pn 0, Wt 0, Śr 0, Czw 0, Pt 2, Sob 0, Nd 0",
      }),
    ).toBeInTheDocument();
  });
});
