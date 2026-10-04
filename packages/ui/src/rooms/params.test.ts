import { describe, expect, it } from "vitest";
import {
  loadRoomListParams,
  roomSegments,
  roomSortOptions,
  roomTags,
  roomWeekNav,
  shownRooms,
} from "./params";
import { SAMPLE_ROOMS } from "./rooms.samples";

const names = (list: typeof SAMPLE_ROOMS) => list.map((room) => room.name);

describe("roomTags", () => {
  it("only what tells something: off, not on the site", () => {
    expect(roomTags({ active: true, onSite: true })).toEqual([]);
    expect(roomTags({ active: true, onSite: false })).toEqual([
      { label: "Ukryty na stronie", tone: "neutral" },
    ]);
    expect(roomTags({ active: false, onSite: false })).toEqual([
      { label: "Nieaktywny", tone: "neutral" },
    ]);
  });
});

describe("shownRooms", () => {
  it("in the centre's order; by name; the busiest first", () => {
    const sorted = (sort?: string) =>
      names(shownRooms(SAMPLE_ROOMS, loadRoomListParams(sort ? { sort } : {})));
    expect(sorted()).toEqual([
      "Gabinet Niebieski",
      "Gabinet Zielony",
      "Sala warsztatowa",
    ]);
    expect(sorted("nazwa")).toEqual([
      "Gabinet Niebieski",
      "Gabinet Zielony",
      "Sala warsztatowa",
    ]);
    expect(sorted("oblozenie")).toEqual([
      "Gabinet Niebieski",
      "Gabinet Zielony",
      "Sala warsztatowa",
    ]);
  });

  it("searches names and places; one segment at a time", () => {
    expect(
      names(shownRooms(SAMPLE_ROOMS, loadRoomListParams({ q: "zielony" }))),
    ).toEqual(["Gabinet Zielony"]);
    const shown = (stan: string) =>
      names(shownRooms(SAMPLE_ROOMS, loadRoomListParams({ stan })));
    expect(shown("otwarte-dzis")).toEqual([
      "Gabinet Niebieski",
      "Gabinet Zielony",
    ]);
    expect(shown("nieaktywne")).toEqual(["Sala warsztatowa"]);
    expect(shown("z-wyjatkami")).toEqual(["Gabinet Niebieski"]);
  });
});

describe("links", () => {
  const path = "/gabinety";

  it("the segments, the orders and the week", () => {
    const params = loadRoomListParams({ stan: "nieaktywne" });
    expect(
      roomSegments(path, params, SAMPLE_ROOMS).map((one) => [
        one.label,
        one.count,
        one.active,
      ]),
    ).toEqual([
      ["Wszystkie", 3, false],
      ["Otwarte dziś", 2, false],
      ["Nieaktywne", 1, true],
      ["Z wyjątkami", 1, false],
    ]);
    expect(
      roomSortOptions(path, loadRoomListParams({})).map((one) => [
        one.label,
        one.href,
        one.active,
      ]),
    ).toEqual([
      ["Kolejność", "/gabinety", true],
      ["Nazwa", "/gabinety?sort=nazwa", false],
      ["Obłożenie", "/gabinety?sort=oblozenie", false],
    ]);
    expect(
      roomWeekNav(path, loadRoomListParams({}), {
        week: "2030-10-07",
        thisWeek: "2030-10-07",
      }),
    ).toMatchObject({
      nextHref: "/gabinety?tydzien=2030-10-14",
      currentHref: null,
    });
  });
});
