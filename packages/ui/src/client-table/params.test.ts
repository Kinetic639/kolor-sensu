import { describe, expect, it } from "vitest";
import {
  clientSortDirection,
  clientSortHref,
  clientTableHref,
  loadClientTableParams,
  toClientSearch,
} from "./params";

describe("the clients list's address", () => {
  it("reads only well-formed values", () => {
    expect(
      loadClientTableParams({
        q: "  jan ",
        sort: "nieznane",
        strona: "3",
        wierszy: "7",
      }),
    ).toEqual({
      q: "jan",
      sort: "ostatnia",
      kierunek: null,
      strona: 3,
      wierszy: 20,
    });
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

  it("a header sorts by its column, then turns round, from page 1", () => {
    const params = loadClientTableParams({ strona: "2" });
    expect(clientSortHref("/klienci", params, "nazwisko")).toBe(
      "/klienci?sort=nazwisko",
    );
    expect(clientSortHref("/klienci", params, "ostatnia")).toBe(
      "/klienci?kierunek=rosnaco",
    );
    expect(clientTableHref("/klienci", params, { strona: 3 })).toBe(
      "/klienci?strona=3",
    );
  });

  it("asks the database for one page", () => {
    expect(
      toClientSearch(
        loadClientTableParams({ q: "jan", sort: "wizyty", strona: "2" }),
      ),
    ).toEqual({
      query: "jan",
      sort: "visits",
      descending: true,
      limit: 20,
      offset: 20,
    });
  });
});
