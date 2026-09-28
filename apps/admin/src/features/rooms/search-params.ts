import { localDateSchema } from "@repo/contracts";
import {
  createLoader,
  createParser,
  createSerializer,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";

// `/gabinety/[id]`: the section (tab) and the schedule's week live in the
// URL, so each renders on the server and has an address.

export const ROOM_TABS = ["grafik", "godziny", "profil", "ustawienia"] as const;
export type RoomTab = (typeof ROOM_TABS)[number];

const parseAsDay = createParser({
  parse: (value) => (localDateSchema.safeParse(value).success ? value : null),
  serialize: (value: string) => value,
});

const roomParsers = {
  zakladka: parseAsStringLiteral(ROOM_TABS).withDefault("grafik"),
  tydzien: parseAsDay,
};

export type RoomParams = inferParserType<typeof roomParsers>;

export const loadRoomParams = createLoader(roomParsers);

const serialize = createSerializer(roomParsers, { clearOnDefault: true });

/** The room's page with the given state; unset values are left out. */
export function roomHref(roomId: string, values: Partial<RoomParams>) {
  return serialize(`/gabinety/${roomId}`, values);
}
