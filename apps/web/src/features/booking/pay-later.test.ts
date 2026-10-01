import { describe, expect, it } from "vitest";
import { payLaterUntil } from "./pay-later";

describe("payLaterUntil", () => {
  const startsAt = "2030-10-10T09:00:00.000Z";

  it("well ahead: pay by the centre's hours before the visit", () => {
    const now = new Date("2030-10-01T09:00:00Z");
    expect(payLaterUntil(startsAt, 48, now)).toBe("2030-10-08T09:00:00.000Z");
    expect(payLaterUntil(startsAt, 24, now)).toBe("2030-10-09T09:00:00.000Z");
  });

  it("too close (less than an hour left to pay): pay now", () => {
    expect(
      payLaterUntil(startsAt, 48, new Date("2030-10-08T08:30:00Z")),
    ).toBeNull();
    expect(
      payLaterUntil(startsAt, 48, new Date("2030-10-09T09:00:00Z")),
    ).toBeNull();
  });
});
