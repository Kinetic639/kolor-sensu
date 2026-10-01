import { describe, expect, it } from "vitest";
import { payLaterUntil } from "./pay-later";

describe("payLaterUntil", () => {
  const startsAt = "2030-10-10T09:00:00.000Z";

  it("well ahead: pay by 48 hours before the visit", () => {
    expect(payLaterUntil(startsAt, new Date("2030-10-01T09:00:00Z"))).toBe(
      "2030-10-08T09:00:00.000Z",
    );
  });

  it("too close (less than an hour left to pay): pay now", () => {
    expect(
      payLaterUntil(startsAt, new Date("2030-10-08T08:30:00Z")),
    ).toBeNull();
    expect(
      payLaterUntil(startsAt, new Date("2030-10-09T09:00:00Z")),
    ).toBeNull();
  });
});
