import { describe, expect, it } from "vitest";
import { announcementRows } from "./view-model";

const one = (id: string, startsOn: string, endsOn: string) => ({
  id,
  message: `Ogłoszenie ${id}`,
  linkLabel: null,
  linkHref: null,
  startsOn,
  endsOn,
});

describe("announcementRows", () => {
  const today = "2026-10-05";
  const rows = announcementRows(
    [
      one("past", "2026-09-01", "2026-09-10"),
      one("later", "2026-12-10", "2026-12-23"),
      one("now", "2026-10-01", "2026-10-07"),
      one("sooner", "2026-11-01", "2026-11-02"),
    ],
    today,
  );

  it("shown now first, then the ones to come (soonest first), then past", () => {
    expect(rows.map((row) => row.id)).toEqual([
      "now",
      "sooner",
      "later",
      "past",
    ]);
  });

  it("each with its state in words, and its days", () => {
    expect(rows[0]).toMatchObject({
      state: "current",
      stateLabel: "Na stronie teraz",
      tone: "success",
      dates: "01.10–07.10.2026",
    });
    expect(rows[1]).toMatchObject({ stateLabel: "Zaplanowane", tone: "info" });
    expect(rows[3]).toMatchObject({
      stateLabel: "Zakończone",
      tone: "neutral",
    });
  });
});
