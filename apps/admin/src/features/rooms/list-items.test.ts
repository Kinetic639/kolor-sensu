import type {
  AdminRoomSummary,
  RoomAvailabilityException,
} from "@repo/contracts";
import type { RoomWeekView } from "@repo/scheduling";
import { describe, expect, it } from "vitest";
import { exceptionText, roomsWeekSummary, toRoomRow } from "./list-items";

const room: AdminRoomSummary = {
  id: "room-1",
  locationId: "location-1",
  name: "Gabinet Zielony",
  slug: "gabinet-zielony",
  description: null,
  active: true,
  publiclyVisible: true,
  capacity: 2,
  sortOrder: 3,
  color: "#16a34a",
  createdAt: "2026-09-20T00:00:00Z",
  updatedAt: "2026-09-20T00:00:00Z",
  locationName: "Siedziba Główna",
  locationSlug: "siedziba-glowna",
  publicProfilePublished: true,
  openWeekdays: [1, 2, 3, 4, 5],
  upcomingExceptionCount: 0,
};

const occupancy = (visitCount: number, booked: number, available: number) => ({
  visitCount,
  bookedMinutes: booked,
  availableMinutes: available,
  bookedHours: booked / 60,
  availableHours: available / 60,
  freeHours: (available - booked) / 60,
  percent: available ? Math.round((booked / available) * 100) : 0,
  overbooked: false,
  overMinutes: 0,
});

const week: RoomWeekView = {
  days: [],
  occupancy: occupancy(3, 150, 600),
  today: null,
  now: null,
  users: [],
  schedule: { range: { start: 480, end: 1080 }, now: null, columns: [] },
};

const exception = (
  patch: Partial<RoomAvailabilityException>,
): RoomAvailabilityException => ({
  id: "e1",
  roomId: "room-1",
  date: "2026-10-12",
  type: "closed_all_day",
  startsAt: null,
  endsAt: null,
  reason: null,
  createdAt: "",
  updatedAt: "",
  ...patch,
});

const workdays = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  startsAt: "08:00",
  endsAt: "20:00",
}));

describe("toRoomRow", () => {
  it("the room, its hours, where it is and its week", () => {
    const row = toRoomRow(room, week, workdays, [exception({})]);
    expect(row).toMatchObject({
      id: "room-1",
      name: "Gabinet Zielony",
      color: "#16a34a",
      href: "/gabinety/room-1",
      location: "Siedziba Główna",
      capacity: 2,
      sortOrder: 3,
      active: true,
      onSite: true,
      hoursSummary: "Pn–Pt 08:00–20:00",
      exceptions: [{ key: "e1", date: "12.10", text: "Zamknięty cały dzień" }],
      occupancy: { percent: 25 },
    });
    expect(row.openingHours[0]).toEqual({
      weekday: "Pn",
      hours: "08:00–20:00",
    });
    expect(row.openingHours[6]).toEqual({ weekday: "Nd", hours: null });
  });

  it("on the site only when active, shown and its profile published", () => {
    for (const change of [
      { publiclyVisible: false },
      { publicProfilePublished: false },
      { active: false },
    ]) {
      expect(toRoomRow({ ...room, ...change }, week, [], []).onSite).toBe(
        false,
      );
    }
    expect(toRoomRow(room, week, [], []).hoursSummary).toBeNull();
  });
});

describe("exceptionText", () => {
  it("what, when and why", () => {
    expect(
      exceptionText(
        exception({
          type: "blocked_interval",
          startsAt: "16:00",
          endsAt: "20:00",
          reason: " malowanie ",
        }),
      ),
    ).toBe("Zablokowane godziny 16:00–20:00 · malowanie");
    expect(
      exceptionText(
        exception({
          type: "extra_available_interval",
          startsAt: "09:00",
          endsAt: "14:00",
        }),
      ),
    ).toBe("Dodatkowo otwarty 09:00–14:00");
  });
});

describe("roomsWeekSummary", () => {
  it("the active rooms' week in a line", () => {
    const row = toRoomRow(room, week, [], []);
    expect(roomsWeekSummary([row, { ...row, active: false }])).toBe(
      "Gabinety: 3 wizyty · 25% obłożenia",
    );
  });
});
