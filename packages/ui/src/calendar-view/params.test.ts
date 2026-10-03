import { describe, expect, it } from "vitest";
import {
  calendarAddHref,
  calendarAvailabilityHref,
  calendarCollapseHref,
  calendarHref,
  calendarNav,
  calendarPanelCloseHref,
  calendarPanelTabs,
  calendarPeriod,
  calendarPerspectiveTabs,
  calendarPickHref,
  calendarViewTabs,
  dayLabel,
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
        "widok=miesiac&data=2030-02-30&perspektywa=sale&wizyta=1&karta=x&puste=tak&lokalizacja=piwnica&zwiniete=anna",
      ),
    ).toEqual({
      widok: null,
      data: null,
      perspektywa: "specjalisci",
      puste: false,
      wyszarz: true,
      wizyty: true,
      dostepnosc: true,
      podsumowanie: false,
      lokalizacja: null,
      q: null,
      zwiniete: [],
      nowa: false,
      termin: null,
      kolumna: null,
      przesun: null,
      wizyta: null,
      okno: null,
      karta: "szczegoly",
    });
    expect(
      load(
        `widok=tydzien&data=2030-10-03&perspektywa=gabinety&puste=true&wizyty=false&lokalizacja=online&q=%20Kowal%20&zwiniete=${anna},online`,
      ),
    ).toMatchObject({
      widok: "tydzien",
      data: "2030-10-03",
      perspektywa: "gabinety",
      puste: true,
      wizyty: false,
      lokalizacja: "online",
      q: "Kowal",
      zwiniete: [anna, "online"],
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
      label: "Sob, 5 paź 2030",
      previousHref: "/kalendarz?data=2030-10-04",
      nextHref: "/kalendarz?data=2030-10-06",
      todayHref: "/kalendarz",
      isCurrent: false,
    });
  });

  it("a week's neighbours; this week is current", () => {
    const nav = calendarNav(path, load("widok=tydzien&data=2030-10-04"), {
      today,
      defaultView: "dzien",
    });
    expect(nav).toMatchObject({
      unit: "tydzień",
      label: "30 września – 6 października 2030",
      previousHref: "/kalendarz?widok=tydzien&data=2030-09-27",
      nextHref: "/kalendarz?widok=tydzien&data=2030-10-11",
      isCurrent: true,
    });
  });

  it("labels a day as the reference does", () => {
    expect(dayLabel("2030-10-02")).toBe("Śr, 2 paź 2030");
  });
});

describe("the calendar's links", () => {
  it("switches the view on the same date, widening the columns", () => {
    const tabs = calendarViewTabs(
      path,
      load(`data=2030-10-03&zwiniete=${anna}`),
      "dzien",
    );
    expect(tabs.map((tab) => [tab.label, tab.href, tab.active])).toEqual([
      ["Dzień", "/kalendarz?widok=dzien&data=2030-10-03", true],
      ["Tydzień", "/kalendarz?widok=tydzien&data=2030-10-03", false],
    ]);
  });

  it("switches the perspective", () => {
    const tabs = calendarPerspectiveTabs(path, load(`zwiniete=${anna}`));
    expect(tabs.map((tab) => [tab.label, tab.href, tab.active])).toEqual([
      ["Specjaliści", "/kalendarz", true],
      ["Gabinety", "/kalendarz?perspektywa=gabinety", false],
    ]);
  });

  it("narrows a column and widens it back", () => {
    expect(calendarCollapseHref(path, load(""), anna)).toBe(
      `/kalendarz?zwiniete=${anna}`,
    );
    expect(
      calendarCollapseHref(path, load(`zwiniete=${anna},online`), anna),
    ).toBe("/kalendarz?zwiniete=online");
  });

  it("opens an availability window instead of a visit", () => {
    const params = load(`wizyta=${visit}`);
    expect(
      calendarAvailabilityHref(path, params, "r1:2030-10-02T06:00:00.000Z"),
    ).toBe("/kalendarz?okno=r1:2030-10-02T06:00:00.000Z");
    expect(load("okno=a%20b").okno).toBeNull();
    expect(load("okno=r1%3A2030-10-02T06%3A00%3A00.000Z").okno).toBe(
      "r1:2030-10-02T06:00:00.000Z",
    );
    expect(calendarPanelCloseHref(path, load("okno=g1:2030-10-02:480"))).toBe(
      "/kalendarz",
    );
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

describe("adding a visit", () => {
  it("reads the mode, the picked time and the column", () => {
    expect(
      load(`nowa=true&termin=2030-10-02T12:15&kolumna=${anna}`),
    ).toMatchObject({ nowa: true, termin: "2030-10-02T12:15", kolumna: anna });
    expect(load("termin=2030-13-02T25:00&kolumna=x")).toMatchObject({
      termin: null,
      kolumna: null,
    });
  });

  it("turns adding on and off, closing any panel", () => {
    const params = load(`data=2030-10-02&wizyta=${visit}`);
    expect(calendarAddHref(path, params, true)).toBe(
      "/kalendarz?data=2030-10-02&nowa=true",
    );
    expect(
      calendarAddHref(
        path,
        load("data=2030-10-02&nowa=true&termin=2030-10-02T12:15"),
        false,
      ),
    ).toBe("/kalendarz?data=2030-10-02");
  });

  it("opens the form at a time, in a column", () => {
    expect(
      calendarPickHref(path, load("nowa=true"), "2030-10-02T09:00", anna),
    ).toBe(`/kalendarz?nowa=true&termin=2030-10-02T09:00&kolumna=${anna}`);
  });
});
