import type { VisitTone } from "@repo/scheduling";
import {
  createLoader,
  createSerializer,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";
import { parseAsOpenRows } from "../resource-roster/open-rows";
import type { RosterSegment } from "../resource-roster/roster-bar";
import type { SortOption } from "../resource-roster/sort-menu";
import { matchesSearch } from "../resource-roster/search";
import { rosterWeekNav } from "../resource-roster/week-nav";
import { parseAsDay, parseAsSearch } from "../visit-table/params";
import type { SpecialistRow, SpecialistState } from "./types";

// The team's roster in the URL: the search, which ones (a segment), the
// order, the week shown and the rows open (with their tab). A centre has
// a handful of specialists, so the server reads them all and searches,
// filters and sorts here; links are built from the parsers.

export const SPECIALIST_SEGMENTS = [
  "aktywni",
  "nieaktywni",
  "weryfikacja",
] as const;

export const SPECIALIST_SORTS = [
  "nazwisko",
  "oblozenie",
  "najblizsza",
  "uslugi",
] as const;

export type SpecialistSort = (typeof SPECIALIST_SORTS)[number];

export const specialistListParsers = {
  q: parseAsSearch,
  /** Which ones: working, not, a profile to review, not taking new clients. */
  stan: parseAsStringLiteral(SPECIALIST_SEGMENTS),
  sort: parseAsStringLiteral(SPECIALIST_SORTS).withDefault("nazwisko"),
  /** The week shown (any of its days); none: this one. */
  tydzien: parseAsDay,
  /** The rows open, and their tabs. */
  otwarte: parseAsOpenRows,
};

export type SpecialistListParams = inferParserType<
  typeof specialistListParsers
>;

export const loadSpecialistListParams = createLoader(specialistListParsers);

const serialize = createSerializer(specialistListParsers, {
  clearOnDefault: true,
});

export function specialistListHref(
  path: string,
  params: SpecialistListParams,
  patch: Partial<SpecialistListParams>,
) {
  return serialize(path, { ...params, ...patch });
}

const PROFILE_TAGS: Record<
  SpecialistState["profile"],
  { label: string; tone: VisitTone }
> = {
  pending: { label: "Do weryfikacji", tone: "warning" },
  published: { label: "Opublikowany", tone: "info" },
  rejected: { label: "Profil odrzucony", tone: "danger" },
  draft: { label: "Szkic profilu", tone: "neutral" },
  none: { label: "Bez profilu", tone: "neutral" },
};

/** Their profile on the site, as a tag. */
export function profileTag(profile: SpecialistState["profile"]) {
  return PROFILE_TAGS[profile];
}

/** What their state tells, as small tags; working is the norm (only on their page). */
export function specialistTags(
  state: SpecialistState,
  { withActive = false }: { withActive?: boolean } = {},
): { label: string; tone: VisitTone }[] {
  const tags: { label: string; tone: VisitTone }[] = [];
  if (!state.active) tags.push({ label: "Zawieszony", tone: "neutral" });
  // Signed in, maybe, but nothing of theirs is on the site yet.
  else if (state.onSite === false) {
    tags.push({ label: "W przygotowaniu", tone: "info" });
  } else if (withActive) tags.push({ label: "Aktywny", tone: "success" });
  tags.push(profileTag(state.profile));
  if (state.active && state.onSite !== false && state.hidden) {
    tags.push({ label: "Ukryty na stronie", tone: "warning" });
  }
  return tags;
}

const IN_SEGMENT: Record<
  (typeof SPECIALIST_SEGMENTS)[number],
  (row: SpecialistRow) => boolean
> = {
  aktywni: (row) => row.state.active && row.state.onSite !== false,
  nieaktywni: (row) => !row.state.active,
  weryfikacja: (row) => row.state.profile === "pending",
};

const collator = new Intl.Collator("pl");
const byName = (a: SpecialistRow, b: SpecialistRow) =>
  collator.compare(a.name, b.name);
const nextAt = (row: SpecialistRow) => {
  const next = row.upcoming[0];
  return next ? `${next.date}T${next.startTime}` : null;
};

/** The soonest first; none last. */
function bySoonest(a: SpecialistRow, b: SpecialistRow) {
  const [x, y] = [nextAt(a), nextAt(b)];
  if (x === y) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  return x < y ? -1 : 1;
}

// Each order its own way: names A–Z, the busiest first, the soonest
// visit first (none last), the most services first.
const ORDER: Record<
  SpecialistSort,
  (a: SpecialistRow, b: SpecialistRow) => number
> = {
  nazwisko: byName,
  oblozenie: (a, b) => b.occupancy.percent - a.occupancy.percent,
  najblizsza: bySoonest,
  uslugi: (a, b) => b.services - a.services,
};

/** The rows the address asks for: searched, in the segment, in order. */
export function shownSpecialists(
  rows: SpecialistRow[],
  params: SpecialistListParams,
): SpecialistRow[] {
  const matches = matchesSearch(params.q);
  const segment = params.stan ? IN_SEGMENT[params.stan] : null;
  return rows
    .filter((row) => matches(`${row.name} ${row.title ?? ""}`))
    .filter((row) => !segment || segment(row))
    .sort((a, b) => ORDER[params.sort](a, b) || byName(a, b));
}

const SEGMENT_LABELS: Record<(typeof SPECIALIST_SEGMENTS)[number], string> = {
  aktywni: "Aktywni",
  nieaktywni: "Nieaktywni",
  weryfikacja: "Do weryfikacji",
};

/**
 * "Wszyscy" and the segments with anyone in them (or chosen), each with
 * how many; the open rows stay open.
 */
export function specialistSegments(
  path: string,
  params: SpecialistListParams,
  rows: SpecialistRow[],
): RosterSegment[] {
  return [
    {
      key: "wszyscy",
      label: "Wszyscy",
      count: rows.length,
      href: specialistListHref(path, params, { stan: null }),
      active: !params.stan,
    },
    ...SPECIALIST_SEGMENTS.flatMap((key) => {
      const count = rows.filter(IN_SEGMENT[key]).length;
      const active = params.stan === key;
      return count || active
        ? [
            {
              key,
              label: SEGMENT_LABELS[key],
              count,
              href: specialistListHref(path, params, { stan: key }),
              active,
            },
          ]
        : [];
    }),
  ];
}

const SORT_LABELS: Record<SpecialistSort, string> = {
  nazwisko: "Nazwisko",
  oblozenie: "Obłożenie",
  najblizsza: "Najbliższa wizyta",
  uslugi: "Liczba usług",
};

export function specialistSortOptions(
  path: string,
  params: SpecialistListParams,
): SortOption[] {
  return SPECIALIST_SORTS.map((key) => ({
    key,
    label: SORT_LABELS[key],
    href: specialistListHref(path, params, { sort: key }),
    active: params.sort === key,
  }));
}

/** The week shown and its neighbours; this week has no date. */
export function specialistWeekNav(
  path: string,
  params: SpecialistListParams,
  weeks: { week: string; thisWeek: string },
) {
  return rosterWeekNav(
    (tydzien) => specialistListHref(path, params, { tydzien }),
    weeks,
  );
}
