import { describe, expect, it } from "vitest";
import {
  isFiltered,
  loadVisitTableParams,
  pastPeriod,
  sortDirection,
  sortHref,
  toVisitSearch,
  visitPanelCloseHref,
  visitPanelTabs,
  visitPeriod,
  visitTableHref,
} from "./params";

const path = "/kalendarz";
const anna = "0b8f1f6e-2c1d-4c3a-9a55-3f1d2e4b5c6d";
const room = "5c2e7a10-9f3b-4d1e-8a6c-2b7d9e0f1a3c";
const load = (query: string) =>
  loadVisitTableParams(new URLSearchParams(query));
const timeZone = "Europe/Warsaw";
// Wednesday 1 October 2030, 10:00 in Warsaw.
const now = new Date("2030-10-02T08:00:00Z");

describe("the bookings table's address", () => {
  it("reads only allowed values; anything else is the default", () => {
    expect(
      load(
        "q=%20Kowalski%20&status=do-zwrotu&platnosc=wszystko&zakres=kiedys&sort=email&strona=abc&wierszy=1000&specjalista=anna&miejsce=piwnica&od=2030-02-30&wizyta=1",
      ),
    ).toEqual({
      q: "Kowalski",
      status: null,
      platnosc: null,
      specjalista: null,
      usluga: null,
      miejsce: null,
      zakres: "nadchodzace",
      od: null,
      do: null,
      utworzono: null,
      utworzono_od: null,
      utworzono_do: null,
      zmiana: null,
      zmiana_od: null,
      zmiana_do: null,
      sort: "termin",
      kierunek: null,
      strona: 1,
      wierszy: 20,
      wizyta: null,
      karta: "szczegoly",
    });
    expect(load("q=" + "a".repeat(300)).q).toHaveLength(100);
    expect(load(`miejsce=online&wizyta=${anna}`)).toMatchObject({
      miejsce: ["online"],
      wizyta: anna,
    });
    // Several values each, the wrong ones left out, none twice.
    expect(
      load(
        `specjalista=${anna},nie-id,${anna}&miejsce=online,${room}&platnosc=oplacone,zwrocone`,
      ),
    ).toMatchObject({
      specjalista: [anna],
      miejsce: ["online", room],
      platnosc: ["oplacone", "zwrocone"],
    });
  });

  it("leaves defaults out of links", () => {
    const params = load(`specjalista=${anna}`);
    expect(visitTableHref(path, params, { strona: 2 })).toBe(
      `/kalendarz?specjalista=${anna}&strona=2`,
    );
    expect(visitTableHref(path, params, { specjalista: null })).toBe(
      "/kalendarz",
    );
  });

  it("sorts by a column, turns it round, then stops sorting, from page 1", () => {
    expect(sortHref(path, load("strona=3"), "miejsce")).toBe(
      "/kalendarz?sort=miejsce",
    );
    expect(sortHref(path, load("sort=klient&strona=3"), "klient")).toBe(
      "/kalendarz?sort=klient&kierunek=malejaco",
    );
    expect(
      sortHref(path, load("sort=klient&kierunek=malejaco&strona=3"), "klient"),
    ).toBe("/kalendarz");
    // By date (the usual order): the other way, then back.
    expect(sortHref(path, load(""), "termin")).toBe(
      "/kalendarz?kierunek=malejaco",
    );
    expect(sortHref(path, load("kierunek=malejaco"), "termin")).toBe(
      "/kalendarz",
    );
  });

  it("shows past visits latest first unless asked otherwise", () => {
    expect(sortDirection(load("zakres=minione"))).toBe("desc");
    expect(sortDirection(load("zakres=minione&kierunek=rosnaco"))).toBe("asc");
    expect(sortDirection(load(""))).toBe("asc");
  });

  it("knows when the table is narrowed (not by the panel or the page)", () => {
    expect(isFiltered(load(`wizyta=${anna}&strona=2`))).toBe(false);
    expect(isFiltered(load(`miejsce=online`))).toBe(true);
    expect(isFiltered(load(`od=2030-10-01`))).toBe(true);
    expect(isFiltered(load(`zmiana=dzis`))).toBe(true);
  });
});

describe("visitPeriod", () => {
  const period = (query: string) => visitPeriod(load(query), now, timeZone);

  it("ready ranges, in the centre's days", () => {
    expect(period("zakres=dzis")).toEqual({
      from: "2030-10-01T22:00:00.000Z",
      to: "2030-10-02T22:00:00.000Z",
    });
    expect(period("zakres=ten-tydzien")).toEqual({
      from: "2030-09-29T22:00:00.000Z",
      to: "2030-10-06T22:00:00.000Z",
    });
    expect(period("zakres=ten-miesiac")).toEqual({
      from: "2030-09-30T22:00:00.000Z",
      to: "2030-10-31T23:00:00.000Z",
    });
    expect(period("")).toEqual({ from: now.toISOString(), to: null });
    expect(period("zakres=wszystkie")).toEqual({ from: null, to: null });
  });

  it("days of one's own, both ends included, over the ready range", () => {
    expect(period("zakres=minione&od=2030-10-05&do=2030-10-06")).toEqual({
      from: "2030-10-04T22:00:00.000Z",
      to: "2030-10-06T22:00:00.000Z",
    });
    expect(period("do=2030-10-06")).toEqual({
      from: null,
      to: "2030-10-06T22:00:00.000Z",
    });
  });
});

describe("pastPeriod", () => {
  const past = (scope: Parameters<typeof pastPeriod>[0], own = {}) =>
    pastPeriod(scope, { from: null, to: null, ...own }, now, timeZone);

  it("ranges back from today, today included", () => {
    expect(past("dzis")).toEqual({
      from: "2030-10-01T22:00:00.000Z",
      to: "2030-10-02T22:00:00.000Z",
    });
    expect(past("wczoraj")).toEqual({
      from: "2030-09-30T22:00:00.000Z",
      to: "2030-10-01T22:00:00.000Z",
    });
    expect(past("ostatnie-7-dni")).toEqual({
      from: "2030-09-25T22:00:00.000Z",
      to: "2030-10-02T22:00:00.000Z",
    });
    expect(past("ten-miesiac").from).toBe("2030-09-30T22:00:00.000Z");
    expect(past(null)).toEqual({ from: null, to: null });
  });

  it("days of one's own, over the range", () => {
    expect(past("dzis", { from: "2030-09-01", to: "2030-09-02" })).toEqual({
      from: "2030-08-31T22:00:00.000Z",
      to: "2030-09-02T22:00:00.000Z",
    });
  });
});

describe("toVisitSearch", () => {
  it("asks for the page, filtered and sorted", () => {
    expect(
      toVisitSearch(
        load(
          `q=jan&status=odwolane&platnosc=do-zwrotu&usluga=${anna}&miejsce=${room}&utworzono=dzis&sort=kwota&strona=3&wierszy=10`,
        ),
        { now, timeZone },
      ),
    ).toEqual({
      query: "jan",
      statuses: ["cancelled"],
      payments: ["refund_due"],
      specialistIds: null,
      serviceIds: [anna],
      roomIds: [room],
      online: null,
      from: now.toISOString(),
      to: null,
      createdFrom: "2030-10-01T22:00:00.000Z",
      createdTo: "2030-10-02T22:00:00.000Z",
      changedFrom: null,
      changedTo: null,
      sort: "price",
      descending: false,
      limit: 10,
      offset: 20,
      own: false,
    });
  });

  it("online visits; a specialist's own ignore the specialist and payment", () => {
    expect(
      toVisitSearch(
        load(`miejsce=online&specjalista=${anna}&platnosc=oplacone`),
        {
          now,
          own: true,
        },
      ),
    ).toMatchObject({
      online: true,
      roomIds: null,
      specialistIds: null,
      payments: null,
      own: true,
    });
  });
});

describe("the side panel's links", () => {
  it("tabs keep the table and the visit; closing drops both", () => {
    const params = load(`strona=2&wizyta=${anna}&karta=historia`);
    expect(visitPanelTabs(path, params)).toEqual([
      {
        key: "szczegoly",
        label: "Szczegóły",
        href: `/kalendarz?strona=2&wizyta=${anna}`,
      },
      {
        key: "historia",
        label: "Historia",
        href: `/kalendarz?strona=2&wizyta=${anna}&karta=historia`,
      },
    ]);
    expect(visitPanelCloseHref(path, params)).toBe("/kalendarz?strona=2");
  });

  it("the client's tab where clients are seen", () => {
    const params = load(`wizyta=${anna}&karta=klient`);
    expect(params.karta).toBe("klient");
    expect(visitPanelTabs(path, params, { client: true }).at(-1)).toEqual({
      key: "klient",
      label: "Klient",
      href: `/kalendarz?wizyta=${anna}&karta=klient`,
    });
    expect(visitPanelTabs(path, params)).toHaveLength(2);
  });
});
