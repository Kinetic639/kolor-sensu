import { localDateSchema } from "@repo/contracts";
import {
  createLoader,
  createParser,
  createSerializer,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";

// `/dostepnosc`: the view (calendar or rules), the calendar's week and the
// rules' filters live in the URL, so the page renders on the server and
// every state has an address. Malformed values are ignored.

const parseAsDay = createParser({
  parse: (value) => (localDateSchema.safeParse(value).success ? value : null),
  serialize: (value: string) => value,
});

const parseAsWeekday = createParser({
  parse: (value) => (/^[1-7]$/.test(value) ? Number(value) : null),
  serialize: (value: number) => String(value),
});

export const AVAILABILITY_VIEWS = ["kalendarz", "reguly"] as const;

const availabilityParsers = {
  widok: parseAsStringLiteral(AVAILABILITY_VIEWS).withDefault("kalendarz"),
  tydzien: parseAsDay,
  dzien: parseAsWeekday,
  forma: parseAsStringLiteral(["stacjonarnie", "online"] as const),
};

export type AvailabilityParams = inferParserType<typeof availabilityParsers>;

export const loadAvailabilityParams = createLoader(availabilityParsers);

const serialize = createSerializer(availabilityParsers, {
  clearOnDefault: true,
});

/** The page with the given state; unset values are left out. */
export function availabilityHref(values: Partial<AvailabilityParams>) {
  return serialize("/dostepnosc", values);
}
