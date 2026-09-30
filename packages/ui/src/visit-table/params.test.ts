import { describe, expect, it } from "vitest";
import {
  loadVisitTableParams,
  sortDirection,
  sortHref,
  toVisitSearch,
  visitTableHref,
} from "./params";

const path = "/kalendarz";
const anna = "0b8f1f6e-2c1d-4c3a-9a55-3f1d2e4b5c6d";
const load = (query: string) =>
  loadVisitTableParams(new URLSearchParams(query));

describe("the bookings table's address", () => {
  it("reads only allowed values; anything else is the default", () => {
    expect(
      load(
        "q=%20Kowalski%20&status=do-zwrotu&zakres=wszystko&sort=email&strona=abc&wierszy=1000&specjalista=anna",
      ),
    ).toEqual({
      q: "Kowalski",
      status: "do-zwrotu",
      specjalista: null,
      zakres: "nadchodzace",
      sort: "termin",
      kierunek: null,
      strona: 1,
      wierszy: 20,
    });
    expect(load("q=" + "a".repeat(300)).q).toHaveLength(100);
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

  it("sorts by a column, then turns the direction round, from page 1", () => {
    const params = load("strona=3");
    expect(sortHref(path, params, "klient")).toBe("/kalendarz?sort=klient");
    const byClient = load("sort=klient&strona=3");
    expect(sortHref(path, byClient, "klient")).toBe(
      "/kalendarz?sort=klient&kierunek=malejaco",
    );
  });

  it("shows past visits latest first unless asked otherwise", () => {
    expect(sortDirection(load("zakres=minione"))).toBe("desc");
    expect(sortDirection(load("zakres=minione&kierunek=rosnaco"))).toBe("asc");
    expect(sortDirection(load(""))).toBe("asc");
  });
});

describe("toVisitSearch", () => {
  const now = new Date("2030-10-01T08:00:00Z");

  it("asks for the page of upcoming visits, sorted", () => {
    expect(
      toVisitSearch(
        load("q=jan&status=odwolane&sort=kwota&strona=3&wierszy=10"),
        {
          now,
        },
      ),
    ).toEqual({
      query: "jan",
      statuses: ["cancelled"],
      refundDue: false,
      specialistId: null,
      from: "2030-10-01T08:00:00.000Z",
      to: null,
      sort: "price",
      descending: false,
      limit: 10,
      offset: 20,
      own: false,
    });
  });

  it("refunds to settle, past visits, one specialist", () => {
    expect(
      toVisitSearch(
        load(`status=do-zwrotu&zakres=minione&specjalista=${anna}`),
        {
          now,
        },
      ),
    ).toMatchObject({
      statuses: null,
      refundDue: true,
      from: null,
      to: "2030-10-01T08:00:00.000Z",
      specialistId: anna,
      descending: true,
    });
  });

  it("a specialist's own visits ignore the specialist filter", () => {
    expect(
      toVisitSearch(load(`specjalista=${anna}`), { now, own: true }),
    ).toMatchObject({ specialistId: null, own: true });
  });
});
