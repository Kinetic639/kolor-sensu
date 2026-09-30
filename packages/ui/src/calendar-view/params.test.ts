import { describe, expect, it } from "vitest";
import {
  calendarHref,
  calendarNav,
  calendarPanelCloseHref,
  calendarPanelTabs,
  calendarPeriod,
  calendarPerspectiveTabs,
  calendarViewTabs,
  loadCalendarParams,
} from "./params";

const path = "/kalendarz";
const anna = "0b8f1f6e-2c1d-4c3a-9a55-3f1d2e4b5c6d";
const visit = "5c2e7a10-9f3b-4d1e-8a6c-2b7d9e0f1a3c";
const load = (query: string) => loadCalendarParams(new URLSearchParams(query));
const today = "2030-10-02";

describe("the calendar's address", () => {
  it("reads only allowed values", () => {
    expect(
      load(
        "widok=miesiac&data=2030-02-30&perspektywa=sale&zasob=anna&wizyta=1&karta=x",
      ),
    ).toEqual({
      widok: null,
      data: null,
      perspektywa: "specjalisci",
      zasob: null,
      wizyta: null,
      karta: "szczegoly",
    });
    expect(
      load(`widok=tydzien&data=2030-10-03&perspektywa=gabinety&zasob=${anna}`),
    ).toMatchObject({
      widok: "tydzien",
      data: "2030-10-03",
      perspektywa: "gabinety",
      zasob: anna,
    });
  });

  it("leaves defaults out of links", () => {
    expect(calendarHref(path, load(""), { data: "2030-10-03" })).toBe(
      "/kalendarz?data=2030-10-03",
    );
  });
});

describe("calendarPeriod", () => {
  it("today, in the portal's own view, when nothing is asked", () => {
    expect(calendarPeriod(load(""), { today, defaultView: "dzien" })).toEqual({
      view: "dzien",
      date: today,
      from: today,
      to: today,
    });
  });

  it("a week runs Monday to Sunday around the date", () => {
    expect(
      calendarPeriod(load("data=2030-10-03"), {
        today,
        defaultView: "tydzien",
      }),
    ).toEqual({
      view: "tydzien",
      date: "2030-10-03",
      from: "2030-09-30",
      to: "2030-10-06",
    });
  });
});

describe("calendarNav", () => {
  it("a day's neighbours, and back to today; the panel closes", () => {
    const params = load(`data=2030-10-05&wizyta=${visit}`);
    expect(calendarNav(path, params, { today, defaultView: "dzien" })).toEqual({
      unit: "dzień",
      label: "sobota, 5 października 2030",
      title: undefined,
      previousHref: "/kalendarz?data=2030-10-04",
      nextHref: "/kalendarz?data=2030-10-06",
      todayHref: "/kalendarz",
    });
  });

  it("a week's neighbours; none back when it is this week", () => {
    const nav = calendarNav(path, load("widok=tydzien&data=2030-10-04"), {
      today,
      defaultView: "dzien",
    });
    expect(nav).toMatchObject({
      unit: "tydzień",
      label: "30 wrz – 6 paź 2030",
      title: "30 września – 6 października 2030",
      previousHref: "/kalendarz?widok=tydzien&data=2030-09-27",
      nextHref: "/kalendarz?widok=tydzien&data=2030-10-11",
      todayHref: null,
    });
  });
});

describe("the calendar's tabs", () => {
  it("switches the view on the same date", () => {
    const tabs = calendarViewTabs(path, load("data=2030-10-03"), "dzien");
    expect(tabs).toEqual([
      {
        key: "dzien",
        label: "Dzień",
        href: "/kalendarz?widok=dzien&data=2030-10-03",
        active: true,
      },
      {
        key: "tydzien",
        label: "Tydzień",
        href: "/kalendarz?widok=tydzien&data=2030-10-03",
        active: false,
      },
    ]);
  });

  it("switches the perspective and forgets the resource", () => {
    const tabs = calendarPerspectiveTabs(path, load(`zasob=${anna}`));
    expect(tabs.map((tab) => [tab.label, tab.href, tab.active])).toEqual([
      ["Specjaliści", "/kalendarz", true],
      ["Gabinety", "/kalendarz?perspektywa=gabinety", false],
    ]);
  });

  it("the panel's tabs and its closing keep the calendar", () => {
    const params = load(`data=2030-10-03&wizyta=${visit}`);
    expect(calendarPanelTabs(path, params).map((tab) => tab.href)).toEqual([
      `/kalendarz?data=2030-10-03&wizyta=${visit}`,
      `/kalendarz?data=2030-10-03&wizyta=${visit}&karta=historia`,
    ]);
    expect(calendarPanelCloseHref(path, params)).toBe(
      "/kalendarz?data=2030-10-03",
    );
  });
});
