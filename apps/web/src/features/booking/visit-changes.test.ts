import { describe, expect, it } from "vitest";
import { visitChanges } from "./visit-changes";

const policy = {
  cancellationWindowHours: 48,
  rescheduleWindowHours: 48,
  maxSelfReschedules: 1,
};
const visit = {
  status: "confirmed" as const,
  startsAt: "2030-10-10T09:00:00.000Z",
  rescheduleCount: 0,
  priceMinor: 20000,
  paid: true,
};
const hoursBefore = (hours: number) =>
  new Date(Date.parse(visit.startsAt) - hours * 3_600_000);

describe("visitChanges", () => {
  it("more than 48 hours before: move once, or cancel with the money back", () => {
    const changes = visitChanges(visit, policy, hoursBefore(72));
    expect(changes.cancel).toEqual({
      allowed: true,
      refund: true,
      refundUntil: "2030-10-08T09:00:00.000Z",
    });
    expect(changes.reschedule).toEqual({
      allowed: true,
      until: "2030-10-08T09:00:00.000Z",
      remaining: 1,
      blockedBy: null,
    });
  });

  it("exactly at the window: still allowed", () => {
    const changes = visitChanges(visit, policy, hoursBefore(48));
    expect(changes.cancel.refund).toBe(true);
    expect(changes.reschedule.allowed).toBe(true);
  });

  it("inside 48 hours: cancel without a refund; moving only through the centre", () => {
    const changes = visitChanges(visit, policy, hoursBefore(47));
    expect(changes.cancel).toMatchObject({ allowed: true, refund: false });
    expect(changes.reschedule).toMatchObject({
      allowed: false,
      blockedBy: "window",
    });
  });

  it("moved once already: the next move goes through the centre", () => {
    const changes = visitChanges(
      { ...visit, rescheduleCount: 1 },
      policy,
      hoursBefore(100),
    );
    expect(changes.reschedule).toMatchObject({
      allowed: false,
      remaining: 0,
      blockedBy: "limit",
    });
    expect(changes.cancel.refund).toBe(true);
  });

  it("booked by the centre, paid on site: cancelling gives nothing back", () => {
    const changes = visitChanges(
      { ...visit, paid: false },
      policy,
      hoursBefore(100),
    );
    expect(changes.cancel).toMatchObject({ allowed: true, refund: false });
    expect(changes.reschedule.allowed).toBe(true);
  });

  it("the centre turned self-moving off", () => {
    const changes = visitChanges(
      visit,
      { ...policy, maxSelfReschedules: 0 },
      hoursBefore(100),
    );
    expect(changes.reschedule).toMatchObject({
      allowed: false,
      blockedBy: "limit",
    });
  });

  it("a visit that is past, cancelled or unpaid changes nothing", () => {
    for (const [changed, now] of [
      [visit, hoursBefore(-1)],
      [{ ...visit, status: "cancelled" as const }, hoursBefore(100)],
      [{ ...visit, status: "awaiting_payment" as const }, hoursBefore(100)],
    ] as const) {
      const changes = visitChanges(changed, policy, now);
      expect(changes.cancel.allowed).toBe(false);
      expect(changes.reschedule).toMatchObject({
        allowed: false,
        blockedBy: "status",
      });
    }
  });

  it("a free visit has nothing to refund", () => {
    expect(
      visitChanges({ ...visit, priceMinor: 0 }, policy, hoursBefore(100)).cancel
        .refund,
    ).toBe(false);
  });
});
