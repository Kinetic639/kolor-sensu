import type { AdminRoomSummary } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { toRoomListItems } from "./list-items";

const room: AdminRoomSummary = {
  id: "room-1",
  locationId: "location-1",
  name: "Gabinet Zielony",
  slug: "gabinet-zielony",
  description: null,
  active: true,
  publiclyVisible: true,
  capacity: 2,
  sortOrder: 0,
  color: "#16a34a",
  createdAt: "2026-09-20T00:00:00Z",
  updatedAt: "2026-09-20T00:00:00Z",
  locationName: "Siedziba Główna",
  locationSlug: "siedziba-glowna",
  publicProfilePublished: true,
  openWeekdays: [1, 2, 3, 4, 5],
  upcomingExceptionCount: 0,
};

describe("toRoomListItems", () => {
  it("lists a room with its colour, location, days, capacity and statuses", () => {
    expect(toRoomListItems([room])[0]).toEqual({
      id: "room-1",
      href: "/gabinety/room-1",
      name: "Gabinet Zielony",
      description: "Siedziba Główna",
      color: "#16a34a",
      facts: ["Otwarty Pn–Pt", "Pojemność 2"],
      statuses: [
        { label: "Aktywny", tone: "success" },
        { label: "Na stronie", tone: "info" },
      ],
      tags: ["active", "on-site"],
      muted: false,
    });
  });

  it("says when a room has no opening hours", () => {
    expect(toRoomListItems([{ ...room, openWeekdays: [] }])[0]!.facts).toEqual([
      "Bez godzin otwarcia",
      "Pojemność 2",
    ]);
  });

  it("gives a room without its own colour the automatic one", () => {
    expect(toRoomListItems([{ ...room, color: null }])[0]!.color).toMatch(
      /^var\(--resource-[1-6]\)$/,
    );
  });

  it("is on the site only when shown and its profile is published", () => {
    for (const change of [
      { publiclyVisible: false },
      { publicProfilePublished: false },
    ]) {
      const [item] = toRoomListItems([{ ...room, ...change }]);
      expect(item!.tags).toEqual(["active"]);
      expect(item!.statuses).toEqual([{ label: "Aktywny", tone: "success" }]);
    }
  });

  it("dims an inactive room, never on the site", () => {
    const [item] = toRoomListItems([{ ...room, active: false }]);
    expect(item).toMatchObject({
      statuses: [{ label: "Nieaktywny", tone: "neutral" }],
      tags: ["inactive"],
      muted: true,
    });
  });
});
