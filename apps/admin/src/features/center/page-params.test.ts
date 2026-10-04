import { describe, expect, it } from "vitest";
import { loadSettingsParams, settingsHref, settingsTabs } from "./page-params";

describe("Ustawienia in the address", () => {
  it("opens on the centre; the tab is kept in the address", () => {
    expect(loadSettingsParams(new URLSearchParams("")).zakladka).toBe(
      "centrum",
    );
    expect(
      loadSettingsParams(new URLSearchParams("?zakladka=rezerwacje")).zakladka,
    ).toBe("rezerwacje");
    expect(
      loadSettingsParams(new URLSearchParams("?zakladka=nic")).zakladka,
    ).toBe("centrum");
  });

  it("links each tab, the centre without one", () => {
    expect(settingsHref("centrum")).toBe("/ustawienia");
    expect(
      settingsTabs({ lokalizacje: 2 }).map((tab) => [
        tab.label,
        tab.href,
        tab.count,
      ]),
    ).toEqual([
      ["Centrum", "/ustawienia", undefined],
      ["Lokalizacje", "/ustawienia?zakladka=lokalizacje", 2],
      ["Rezerwacje online", "/ustawienia?zakladka=rezerwacje", undefined],
    ]);
  });
});
