import {
  createLoader,
  createSerializer,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";
import type { ScheduleNav } from "../calendar-view/schedule-toolbar";
import { scheduleWeekNav } from "../resource-roster/week-nav";
import { parseAsDay } from "../visit-table/params";

// A specialist's page (`/specjalisci/[id]`): its section (tab) and the
// schedule's week live in the URL, so each renders on the server, loads
// only what it shows and has an address.

export const SPECIALIST_PAGE_TABS = [
  "przeglad",
  "grafik",
  "uslugi",
  "profil",
  "ustawienia",
] as const;

export type SpecialistPageTab = (typeof SPECIALIST_PAGE_TABS)[number];

export const SPECIALIST_PAGE_TAB_LABELS: Record<SpecialistPageTab, string> = {
  przeglad: "Przegląd",
  grafik: "Grafik",
  uslugi: "Usługi i cennik",
  profil: "Profil publiczny",
  ustawienia: "Ustawienia",
};

export const specialistPageParsers = {
  zakladka: parseAsStringLiteral(SPECIALIST_PAGE_TABS).withDefault("przeglad"),
  /** The schedule's week (its Monday or any of its days). */
  tydzien: parseAsDay,
  /** The profile's preview: what the site shows, or the draft to review. */
  wersja: parseAsStringLiteral(["opublikowany", "szkic"] as const).withDefault(
    "opublikowany",
  ),
};

export type SpecialistPageParams = inferParserType<
  typeof specialistPageParsers
>;

export const loadSpecialistPageParams = createLoader(specialistPageParsers);

const serialize = createSerializer(specialistPageParsers, {
  clearOnDefault: true,
});

/** The specialist's page with the given state; unset values are left out. */
export function specialistPageHref(
  id: string,
  values: Partial<SpecialistPageParams> = {},
) {
  return serialize(`/specjalisci/${id}`, values);
}

/**
 * The schedule tab's week and its neighbours, for the calendar's bar;
 * this week has no date in the address.
 */
export function specialistScheduleNav(
  id: string,
  weeks: { week: string; thisWeek: string },
): ScheduleNav {
  return scheduleWeekNav(
    (tydzien) => specialistPageHref(id, { zakladka: "grafik", tydzien }),
    weeks,
  );
}

/** The page's tabs, as links (`count`: e.g. the services). */
export function specialistPageTabs(
  id: string,
  counts: Partial<Record<SpecialistPageTab, number>> = {},
) {
  return SPECIALIST_PAGE_TABS.map((key) => ({
    key,
    label: SPECIALIST_PAGE_TAB_LABELS[key],
    href: specialistPageHref(id, { zakladka: key }),
    count: counts[key],
  }));
}
