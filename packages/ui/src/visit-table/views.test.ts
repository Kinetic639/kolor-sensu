import { describe, expect, it } from "vitest";
import { loadVisitTableParams } from "./params";
import { currentView, viewHref, viewParams, visitViews } from "./views";

const load = (query: string) =>
  loadVisitTableParams(Object.fromEntries(new URLSearchParams(query)));

describe("the bookings table's views", () => {
  it("names the view the address shows", () => {
    expect(currentView(load(""), true)?.label).toBe("Nadchodzące");
    expect(currentView(load("zakres=dzis"), true)?.label).toBe("Dziś");
    expect(currentView(load("status=oczekujace"), true)?.label).toBe(
      "Czeka na płatność",
    );
    expect(
      currentView(load("zakres=wszystkie&platnosc=do-zwrotu"), true)?.label,
    ).toBe("Do rozliczenia");
  });

  it("any other set of filters is one's own view; the page and panel do not count", () => {
    expect(currentView(load("zakres=dzis&q=jan"), true)).toBeNull();
    expect(
      currentView(load("status=oczekujace,potwierdzone"), true),
    ).toBeNull();
    expect(currentView(load("strona=3&sort=klient"), true)?.label).toBe(
      "Nadchodzące",
    );
  });

  it("payments only where they are shown", () => {
    expect(visitViews(false).map((v) => v.id)).not.toContain("do-rozliczenia");
    expect(
      currentView(load("zakres=wszystkie&platnosc=do-zwrotu"), false),
    ).toBeNull();
  });

  it("a view clears the other filters and the search, from page 1", () => {
    const params = load(
      "q=jan&specjalista=00000000-0000-4000-8000-000000000001&strona=4&sort=klient",
    );
    const waiting = visitViews(true).find((v) => v.id === "oczekujace")!;
    expect(viewHref("/rezerwacje", params, waiting)).toBe(
      "/rezerwacje?status=oczekujace&sort=klient",
    );
    const all = visitViews(true).find((v) => v.id === "wszystkie")!;
    expect(viewParams(all)).toMatchObject({ zakres: "wszystkie", q: null });
  });
});
