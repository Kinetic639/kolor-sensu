import { describe, expect, it } from "vitest";
import {
  loadSpecialistPageParams,
  specialistPageHref,
  specialistPageTabs,
  specialistScheduleNav,
} from "./page-params";

const ID = "11111111-1111-4111-8111-111111111111";

describe("the specialist's page in the address", () => {
  it("the overview by default; other sections and a week by name", () => {
    expect(loadSpecialistPageParams({})).toEqual({
      zakladka: "przeglad",
      tydzien: null,
      wersja: "opublikowany",
    });
    expect(
      specialistPageHref(ID, { zakladka: "profil", wersja: "szkic" }),
    ).toBe(`/specjalisci/${ID}?zakladka=profil&wersja=szkic`);
    expect(
      loadSpecialistPageParams({ zakladka: "nieznana", tydzien: "2030-02-31" }),
    ).toEqual({ zakladka: "przeglad", tydzien: null, wersja: "opublikowany" });
    expect(specialistPageHref(ID)).toBe(`/specjalisci/${ID}`);
    expect(
      specialistPageHref(ID, { zakladka: "grafik", tydzien: "2030-10-07" }),
    ).toBe(`/specjalisci/${ID}?zakladka=grafik&tydzien=2030-10-07`);
  });

  it("the tabs, a count where given", () => {
    const tabs = specialistPageTabs(ID, { uslugi: 4 });
    expect(tabs.map((tab) => tab.label)).toEqual([
      "Przegląd",
      "Grafik",
      "Usługi i cennik",
      "Profil publiczny",
      "Ustawienia",
    ]);
    expect(tabs[0]!.href).toBe(`/specjalisci/${ID}`);
    expect(tabs[2]).toMatchObject({
      href: `/specjalisci/${ID}?zakladka=uslugi`,
      count: 4,
    });
  });
});

describe("specialistScheduleNav", () => {
  it("the week shown and its neighbours; this week drops the date", () => {
    const nav = specialistScheduleNav(ID, {
      week: "2030-10-07",
      thisWeek: "2030-09-30",
    });
    expect(nav).toMatchObject({
      unit: "tydzień",
      isCurrent: false,
      previousHref: `/specjalisci/${ID}?zakladka=grafik`,
      nextHref: `/specjalisci/${ID}?zakladka=grafik&tydzien=2030-10-14`,
      todayHref: `/specjalisci/${ID}?zakladka=grafik`,
    });
    expect(nav.label).toMatch(/7.*13 października 2030/);
    expect(
      specialistScheduleNav(ID, { week: "2030-09-30", thisWeek: "2030-09-30" })
        .isCurrent,
    ).toBe(true);
  });
});
