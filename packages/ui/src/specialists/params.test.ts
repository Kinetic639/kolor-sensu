import { describe, expect, it } from "vitest";
import {
  loadSpecialistListParams,
  shownSpecialists,
  specialistSegments,
  specialistSortOptions,
  specialistTags,
  specialistWeekNav,
} from "./params";
import { specialistRow } from "./specialists.samples";

const ANNA = "11111111-1111-4111-8111-111111111111";
const MICHAL = "22222222-2222-4222-8222-222222222222";
const EWA = "33333333-3333-4333-8333-333333333333";

const rows = [
  specialistRow({
    id: ANNA,
    name: "Anna Kłobuchowska",
    title: "Psycholog",
    services: 4,
    percent: 78,
    next: ["2030-10-07", "08:00"],
  }),
  specialistRow({
    id: MICHAL,
    name: "Michał Stępień",
    title: "Psychoterapeuta",
    services: 2,
    percent: 93,
    next: ["2030-10-06", "09:00"],
  }),
  specialistRow({
    id: EWA,
    name: "Ewa Wójcik",
    services: 0,
    state: { active: false, profile: "pending" },
    percent: 0,
  }),
];

const names = (list: typeof rows) => list.map((row) => row.name);

describe("specialistTags", () => {
  it("only what tells something: off, waiting, not taking new clients", () => {
    expect(
      specialistTags({
        active: true,
        profile: "published",
      }).map((tag) => tag.label),
    ).toEqual(["Opublikowany"]);
    expect(
      specialistTags({
        active: false,
        profile: "pending",
      }),
    ).toEqual([
      { label: "Zawieszony", tone: "neutral" },
      { label: "Do weryfikacji", tone: "warning" },
    ]);
    expect(
      specialistTags(
        { active: true, profile: "rejected" },
        { withActive: true },
      ),
    ).toEqual([
      { label: "Aktywny", tone: "success" },
      { label: "Profil odrzucony", tone: "danger" },
    ]);
  });

  it("not on the site yet (no profile approved): in preparation, not active", () => {
    expect(
      specialistTags(
        { active: true, profile: "draft", onSite: false },
        { withActive: true },
      ).map((tag) => tag.label),
    ).toEqual(["W przygotowaniu", "Szkic profilu"]);
    expect(
      specialistTags(
        { active: true, profile: "published", onSite: true, hidden: true },
        { withActive: true },
      ).map((tag) => tag.label),
    ).toEqual(["Aktywny", "Opublikowany", "Ukryty na stronie"]);
  });
});

describe("shownSpecialists", () => {
  it("A–Z by default; the search finds names and titles, without accents", () => {
    expect(names(shownSpecialists(rows, loadSpecialistListParams({})))).toEqual(
      ["Anna Kłobuchowska", "Ewa Wójcik", "Michał Stępień"],
    );
    expect(
      names(
        shownSpecialists(rows, loadSpecialistListParams({ q: "terapeuta" })),
      ),
    ).toEqual(["Michał Stępień"]);
    expect(
      shownSpecialists(rows, loadSpecialistListParams({ q: "KLOBUCH" })),
    ).toHaveLength(1);
  });

  it("one segment at a time", () => {
    const shown = (stan: string) =>
      names(shownSpecialists(rows, loadSpecialistListParams({ stan })));
    expect(shown("aktywni")).toEqual(["Anna Kłobuchowska", "Michał Stępień"]);
    expect(shown("nieaktywni")).toEqual(["Ewa Wójcik"]);
    expect(shown("weryfikacja")).toEqual(["Ewa Wójcik"]);
  });

  it("busiest first, the soonest visit first (none last), most services first", () => {
    const sorted = (sort: string) =>
      names(shownSpecialists(rows, loadSpecialistListParams({ sort })));
    expect(sorted("oblozenie")).toEqual([
      "Michał Stępień",
      "Anna Kłobuchowska",
      "Ewa Wójcik",
    ]);
    expect(sorted("najblizsza")).toEqual([
      "Michał Stępień",
      "Anna Kłobuchowska",
      "Ewa Wójcik",
    ]);
    expect(sorted("uslugi")).toEqual([
      "Anna Kłobuchowska",
      "Michał Stępień",
      "Ewa Wójcik",
    ]);
  });
});

describe("links", () => {
  const path = "/specjalisci";

  it("the segments: counts of all, the current one marked, open rows kept", () => {
    const params = loadSpecialistListParams({
      stan: "aktywni",
      otwarte: ANNA,
    });
    const segments = specialistSegments(path, params, rows);
    expect(segments.map((one) => [one.label, one.count, one.active])).toEqual([
      ["Wszyscy", 3, false],
      ["Aktywni", 2, true],
      ["Nieaktywni", 1, false],
      ["Do weryfikacji", 1, false],
    ]);
    expect(segments[0]!.href).toBe(`/specjalisci?otwarte=${ANNA}`);
  });

  it("a segment with nobody in it is left out, unless chosen", () => {
    const labels = specialistSegments(
      path,
      loadSpecialistListParams({}),
      rows.slice(1, 2),
    ).map((one) => one.label);
    expect(labels).toEqual(["Wszyscy", "Aktywni"]);
  });

  it("the orders", () => {
    const options = specialistSortOptions(
      path,
      loadSpecialistListParams({ sort: "oblozenie" }),
    );
    expect(options.map((one) => [one.label, one.href, one.active])).toEqual([
      ["Nazwisko", "/specjalisci", false],
      ["Obłożenie", "/specjalisci?sort=oblozenie", true],
      ["Najbliższa wizyta", "/specjalisci?sort=najblizsza", false],
      ["Liczba usług", "/specjalisci?sort=uslugi", false],
    ]);
  });

  it("the week and its neighbours; this week has no date", () => {
    const nav = specialistWeekNav(path, loadSpecialistListParams({}), {
      week: "2030-10-07",
      thisWeek: "2030-09-30",
    });
    expect(nav).toMatchObject({
      previousHref: "/specjalisci",
      nextHref: "/specjalisci?tydzien=2030-10-14",
      currentHref: "/specjalisci",
    });
    expect(nav.label).toMatch(/7.*13 października 2030/);
    expect(
      specialistWeekNav(path, loadSpecialistListParams({}), {
        week: "2030-09-30",
        thisWeek: "2030-09-30",
      }).currentHref,
    ).toBeNull();
  });
});
