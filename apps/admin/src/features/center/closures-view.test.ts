import { describe, expect, it } from "vitest";
import { closureRows } from "./closures-view";

const one = (id: string, startsOn: string, endsOn: string) => ({
  id,
  startsOn,
  endsOn,
  reason: `Powód ${id}`,
});

describe("closureRows", () => {
  const today = "2026-10-05";
  const rows = closureRows(
    [
      one("past", "2026-08-15", "2026-08-15"),
      one("later", "2026-12-24", "2026-12-31"),
      one("now", "2026-10-04", "2026-10-06"),
      one("sooner", "2026-11-11", "2026-11-11"),
      one("long-ago", "2026-05-01", "2026-05-03"),
    ],
    today,
    { later: 2 },
  );

  it("the closed days now and to come (the soonest first), then the past (the latest first)", () => {
    expect(rows.map((row) => row.id)).toEqual([
      "now",
      "sooner",
      "later",
      "past",
      "long-ago",
    ]);
  });

  it("each with its state, its days and the visits booked on them", () => {
    expect(rows[0]).toMatchObject({
      stateLabel: "Trwa",
      tone: "warning",
      dates: "04.10–06.10.2026",
      days: 3,
    });
    expect(rows[1]).toMatchObject({ stateLabel: "Zaplanowane", tone: "info" });
    expect(rows[2]).toMatchObject({ visits: 2 });
    expect(rows[3]).toMatchObject({
      stateLabel: "Minęło",
      tone: "neutral",
      visits: 0,
    });
  });
});
