import { describe, expect, it } from "vitest";
import {
  loadServicePageParams,
  servicePageHref,
  servicePageTabs,
} from "./page-params";

describe("a service's page in the address", () => {
  it("opens on the overview; the tab is kept in the address", () => {
    expect(loadServicePageParams(new URLSearchParams("")).zakladka).toBe(
      "przeglad",
    );
    expect(
      loadServicePageParams(new URLSearchParams("?zakladka=tresc")).zakladka,
    ).toBe("tresc");
    expect(
      loadServicePageParams(new URLSearchParams("?zakladka=nic")).zakladka,
    ).toBe("przeglad");
  });

  it("links each tab, the overview without one", () => {
    expect(servicePageHref("abc")).toBe("/oferta/abc");
    expect(servicePageHref("abc", { zakladka: "przeglad" })).toBe(
      "/oferta/abc",
    );
    expect(
      servicePageTabs("abc", { specjalisci: 2 }).map((tab) => [
        tab.label,
        tab.href,
        tab.count,
      ]),
    ).toEqual([
      ["Przegląd", "/oferta/abc", undefined],
      ["Specjaliści i ceny", "/oferta/abc?zakladka=specjalisci", 2],
      ["Treść na stronie", "/oferta/abc?zakladka=tresc", undefined],
      ["Ustawienia", "/oferta/abc?zakladka=ustawienia", undefined],
    ]);
  });
});
