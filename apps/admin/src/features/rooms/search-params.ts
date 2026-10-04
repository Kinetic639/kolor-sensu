import { localDateSchema } from "@repo/contracts";
import { calendarParsers } from "@repo/ui/calendar-view";
import {
  createLoader,
  createParser,
  createSerializer,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";

// `/gabinety/[id]`: the section (tab), the schedule's week and whether it
// shows the closed days live in the URL, so each renders on the server and
// has an address.

export const ROOM_TABS = [
  "przeglad",
  "grafik",
  "godziny",
  "profil",
  "ustawienia",
] as const;
export type RoomTab = (typeof ROOM_TABS)[number];

const parseAsDay = createParser({
  parse: (value) => (localDateSchema.safeParse(value).success ? value : null),
  serialize: (value: string) => value,
});

const roomParsers = {
  zakladka: parseAsStringLiteral(ROOM_TABS).withDefault("przeglad"),
  tydzien: parseAsDay,
  /** The schedule hides the days the room is closed (the calendar's switch). */
  zamkniete: calendarParsers.zamkniete,
};

export type RoomParams = inferParserType<typeof roomParsers>;

export const loadRoomParams = createLoader(roomParsers);

const serialize = createSerializer(roomParsers, { clearOnDefault: true });

/** The room's page with the given state; unset values are left out. */
export function roomHref(roomId: string, values: Partial<RoomParams>) {
  return serialize(`/gabinety/${roomId}`, values);
}
