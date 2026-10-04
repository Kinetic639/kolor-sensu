import { describe, expect, it } from "vitest";
import { visitPanelIntake } from "./visit-intake";

describe("visitPanelIntake", () => {
  it("when it was given, in the centre's time; a low mood said", () => {
    expect(
      visitPanelIntake(
        {
          outcome: "struggling",
          givenAt: "2026-10-05T07:30:00Z",
          rows: [{ label: "Trudności", value: "Lęk" }],
        },
        "Europe/Warsaw",
      ),
    ).toEqual({
      givenAt: "05.10, 09:30",
      lowMood: true,
      rows: [{ label: "Trudności", value: "Lęk" }],
    });
  });

  it("a mood of 3 and up: nothing said", () => {
    expect(
      visitPanelIntake(
        { outcome: "ok", givenAt: "2026-10-05T07:30:00Z", rows: [] },
        "Europe/Warsaw",
      ).lowMood,
    ).toBe(false);
  });
});
