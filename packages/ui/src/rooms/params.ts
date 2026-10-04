import type { VisitTone } from "@repo/scheduling";
import {
  createLoader,
  createSerializer,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";
import { parseAsOpenRows } from "../resource-roster/open-rows";
import type { RosterSegment } from "../resource-roster/roster-bar";
import { matchesSearch } from "../resource-roster/search";
import type { SortOption } from "../resource-roster/sort-menu";
import { rosterWeekNav } from "../resource-roster/week-nav";
import { parseAsDay, parseAsSearch } from "../visit-table/params";
import type { RoomRow } from "./types";

// The rooms' roster in the URL: the search, which ones (a segment), the
// order, the week shown and the rows open (with their tab). A centre has
// a few rooms, so the server reads them all and filters here.

export const ROOM_SEGMENTS = [
  "otwarte-dzis",
  "nieaktywne",
  "z-wyjatkami",
] as const;

export const ROOM_SORTS = ["kolejnosc", "nazwa", "oblozenie"] as const;

export type RoomSort = (typeof ROOM_SORTS)[number];

export const roomListParsers = {
  q: parseAsSearch,
  stan: parseAsStringLiteral(ROOM_SEGMENTS),
  sort: parseAsStringLiteral(ROOM_SORTS).withDefault("kolejnosc"),
  tydzien: parseAsDay,
  otwarte: parseAsOpenRows,
};

export type RoomListParams = inferParserType<typeof roomListParsers>;

export const loadRoomListParams = createLoader(roomListParsers);

const serialize = createSerializer(roomListParsers, { clearOnDefault: true });

export function roomListHref(
  path: string,
  params: RoomListParams,
  patch: Partial<RoomListParams>,
) {
  return serialize(path, { ...params, ...patch });
}

/** What its state tells, as small tags; working and shown is the norm. */
export function roomTags(
  room: Pick<RoomRow, "active" | "onSite">,
): { label: string; tone: VisitTone }[] {
  if (!room.active) return [{ label: "Nieaktywny", tone: "neutral" }];
  return room.onSite ? [] : [{ label: "Ukryty na stronie", tone: "neutral" }];
}

const IN_SEGMENT: Record<
  (typeof ROOM_SEGMENTS)[number],
  (room: RoomRow) => boolean
> = {
  "otwarte-dzis": (room) =>
    room.active && room.days.some((day) => day.isToday && day.hours !== null),
  nieaktywne: (room) => !room.active,
  "z-wyjatkami": (room) => room.exceptions.length > 0,
};

const SEGMENT_LABELS: Record<(typeof ROOM_SEGMENTS)[number], string> = {
  "otwarte-dzis": "Otwarte dziś",
  nieaktywne: "Nieaktywne",
  "z-wyjatkami": "Z wyjątkami",
};

const collator = new Intl.Collator("pl");
const byName = (a: RoomRow, b: RoomRow) => collator.compare(a.name, b.name);

const ORDER: Record<RoomSort, (a: RoomRow, b: RoomRow) => number> = {
  kolejnosc: (a, b) => a.sortOrder - b.sortOrder,
  nazwa: byName,
  oblozenie: (a, b) => b.occupancy.percent - a.occupancy.percent,
};

/** The rooms the address asks for: searched, in the segment, in order. */
export function shownRooms(rows: RoomRow[], params: RoomListParams) {
  const matches = matchesSearch(params.q);
  const segment = params.stan ? IN_SEGMENT[params.stan] : null;
  return rows
    .filter((room) => matches(`${room.name} ${room.location}`))
    .filter((room) => !segment || segment(room))
    .sort((a, b) => ORDER[params.sort](a, b) || byName(a, b));
}

/** "Wszystkie" and the segments with any room in them (or chosen). */
export function roomSegments(
  path: string,
  params: RoomListParams,
  rows: RoomRow[],
): RosterSegment[] {
  return [
    {
      key: "wszystkie",
      label: "Wszystkie",
      count: rows.length,
      href: roomListHref(path, params, { stan: null }),
      active: !params.stan,
    },
    ...ROOM_SEGMENTS.flatMap((key) => {
      const count = rows.filter(IN_SEGMENT[key]).length;
      const active = params.stan === key;
      return count || active
        ? [
            {
              key,
              label: SEGMENT_LABELS[key],
              count,
              href: roomListHref(path, params, { stan: key }),
              active,
            },
          ]
        : [];
    }),
  ];
}

const SORT_LABELS: Record<RoomSort, string> = {
  kolejnosc: "Kolejność",
  nazwa: "Nazwa",
  oblozenie: "Obłożenie",
};

export function roomSortOptions(
  path: string,
  params: RoomListParams,
): SortOption[] {
  return ROOM_SORTS.map((key) => ({
    key,
    label: SORT_LABELS[key],
    href: roomListHref(path, params, { sort: key }),
    active: params.sort === key,
  }));
}

/** The week shown and its neighbours; this week has no date. */
export function roomWeekNav(
  path: string,
  params: RoomListParams,
  weeks: { week: string; thisWeek: string },
) {
  return rosterWeekNav(
    (tydzien) => roomListHref(path, params, { tydzien }),
    weeks,
  );
}
