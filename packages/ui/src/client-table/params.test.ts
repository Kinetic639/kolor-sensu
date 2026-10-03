import { describe, expect, it } from "vitest";
import {
  clientSortDirection,
  clientSortHref,
  clientTableHref,
  loadClientTableParams,
  toClientSearch,
} from "./params";

const anna = "0b8f1f6e-2c1d-4c3a-9a55-3f1d2e4b5c6d";
// Friday 9 October 2026, 11:20 in Warsaw.
const now = new Date("2026-10-09T09:20:00Z");
const timeZone = "Europe/Warsaw";

describe("the clients list's address", () => {
  it("reads only well-formed values", () => {
    expect(
      loadClientTableParams({
        q: "  jan ",
        sort: "nieznane",
        strona: "3",
        wierszy: "7",
        nadchodzaca: "jest,kiedys",
        ostatnia: "wczoraj",
        dodany_od: "2026-02-30",
        klient: "nie-id",
      }),
    ).toEqual({
      q: "jan",
      nadchodzaca: ["jest"],
      ostatnia: "wczoraj",
      ostatnia_od: null,
      ostatnia_do: null,
      dodany: null,
      dodany_od: null,
      dodany_do: null,
      sort: "ostatnia",
      kierunek: null,
      strona: 3,
      wierszy: 20,
      klient: null,
      karta: "szczegoly",
    });
    expect(loadClientTableParams({ klient: anna }).klient).toBe(anna);
  });

  it("latest visit first by default; names A–Z", () => {
    const params = loadClientTableParams({});
    expect(clientSortDirection(params)).toBe("desc");
    expect(clientSortDirection({ ...params, sort: "nazwisko" })).toBe("asc");
    expect(
      clientSortDirection({
        ...params,
        sort: "nazwisko",
        kierunek: "malejaco",
      }),
    ).toBe("desc");
  });

  it("a header sorts by its column, turns round, then stops, from page 1", () => {
    const params = loadClientTableParams({ strona: "2" });
    expect(clientSortHref("/klienci", params, "nazwisko")).toBe(
      "/klienci?sort=nazwisko",
    );
    expect(clientSortHref("/klienci", params, "ostatnia")).toBe(
      "/klienci?kierunek=rosnaco",
    );
    expect(
      clientSortHref(
        "/klienci",
        loadClientTableParams({ sort: "wizyty", kierunek: "rosnaco" }),
        "wizyty",
      ),
    ).toBe("/klienci");
    expect(clientTableHref("/klienci", params, { strona: 3 })).toBe(
      "/klienci?strona=3",
    );
  });

  it("asks the database for one page, filtered", () => {
    expect(
      toClientSearch(
        loadClientTableParams({
          q: "jan",
          sort: "wizyty",
          strona: "2",
          nadchodzaca: "brak",
          dodany: "ten-miesiac",
          ostatnia_od: "2026-09-01",
          ostatnia_do: "2026-09-30",
        }),
        { now, timeZone },
      ),
    ).toEqual({
      query: "jan",
      upcoming: false,
      lastFrom: "2026-08-31T22:00:00.000Z",
      lastTo: "2026-09-30T22:00:00.000Z",
      createdFrom: "2026-09-30T22:00:00.000Z",
      createdTo: "2026-10-09T22:00:00.000Z",
      sort: "visits",
      descending: true,
      limit: 20,
      offset: 20,
    });
    // Both ticked: either way, no filter.
    expect(
      toClientSearch(loadClientTableParams({ nadchodzaca: "jest,brak" }), {
        now,
        timeZone,
      }).upcoming,
    ).toBeNull();
  });
});
