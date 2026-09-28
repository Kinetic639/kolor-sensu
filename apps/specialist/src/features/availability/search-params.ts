import { localDateSchema } from "@repo/contracts";
import { createLoader, createParser, createSerializer } from "nuqs/server";

// `/dostepnosc?tydzien=2030-01-07`: the previewed week. Any date of the
// week works (the page uses its Monday); anything else is ignored.
const parseAsDay = createParser({
  parse: (value) => (localDateSchema.safeParse(value).success ? value : null),
  serialize: (value: string) => value,
});

const availabilityParsers = { tydzien: parseAsDay };

export const loadAvailabilityParams = createLoader(availabilityParsers);

const serialize = createSerializer(availabilityParsers);

export function availabilityWeekHref(week: string) {
  return serialize("/dostepnosc", { tydzien: week });
}
