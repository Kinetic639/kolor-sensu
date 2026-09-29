import { describe, expect, it } from "vitest";
import { localTime, visitLabel } from "./visit-label";

describe("visitLabel", () => {
  it("reads a visit's time where the centre is, summer and winter", () => {
    expect(visitLabel("2030-10-02T08:00:00Z", "Europe/Warsaw")).toBe(
      "środa, 2 października 2030, godz. 10:00",
    );
    expect(visitLabel("2030-01-07T08:00:00Z", "Europe/Warsaw")).toBe(
      "poniedziałek, 7 stycznia 2030, godz. 09:00",
    );
    expect(localTime("2030-01-07T23:30:00Z", "Europe/Warsaw")).toBe("00:30");
  });
});
