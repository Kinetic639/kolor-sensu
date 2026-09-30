import { BookingError } from "@repo/supabase";
import { describe, expect, it, vi } from "vitest";
import {
  cancelVisit,
  cancelVisitAsCentre,
  rescheduleVisit,
  type ChangeVisitDeps,
} from "./change-visit";

function deps(overrides: Partial<ChangeVisitDeps> = {}) {
  return {
    cancel: vi.fn().mockResolvedValue({
      reference: "KS-1",
      refundMinor: 20000,
      paymentIntentId: "pi_1",
    }),
    refund: vi.fn().mockResolvedValue(20000),
    recordRefund: vi.fn().mockResolvedValue(true),
    reschedule: vi.fn().mockResolvedValue({
      reference: "KS-1",
      startsAt: "2030-10-03T09:00:00+00:00",
      endsAt: "2030-10-03T09:50:00+00:00",
      rescheduleCount: 1,
    }),
    notify: vi.fn().mockResolvedValue("sent"),
    ...overrides,
  } satisfies ChangeVisitDeps;
}

describe("cancelVisit", () => {
  it("cancels, gives the money back through Stripe and tells the client", async () => {
    const d = deps();
    expect(await cancelVisit("link-token", 1, d)).toEqual({
      ok: true,
      refundMinor: 20000,
      refundFailed: false,
    });
    expect(d.refund).toHaveBeenCalledWith("pi_1", 20000, "KS-1");
    expect(d.recordRefund).toHaveBeenCalledWith("pi_1", 20000);
    expect(d.notify).toHaveBeenCalledWith({
      kind: "cancelled",
      reference: "KS-1",
      manageToken: "link-token",
      sequence: 1,
      refundMinor: 20000,
    });
  });

  it("refunds nothing after the centre's window", async () => {
    const d = deps({
      cancel: vi.fn().mockResolvedValue({
        reference: "KS-1",
        refundMinor: 0,
        paymentIntentId: "pi_1",
      }),
    });
    expect(await cancelVisit("t", 0, d)).toMatchObject({
      ok: true,
      refundMinor: 0,
    });
    expect(d.refund).not.toHaveBeenCalled();
  });

  it("keeps the cancellation when Stripe fails; the centre refunds by hand", async () => {
    const d = deps({ refund: vi.fn().mockRejectedValue(new Error("down")) });
    expect(await cancelVisit("t", 0, d)).toEqual({
      ok: true,
      refundMinor: 20000,
      refundFailed: true,
    });
    expect(d.notify).toHaveBeenCalled();
  });

  it("says why it could not cancel", async () => {
    const d = deps({
      cancel: vi
        .fn()
        .mockRejectedValue(new BookingError("not_cancellable", "no")),
    });
    expect(await cancelVisit("t", 0, d)).toEqual({
      ok: false,
      code: "not_cancellable",
    });
    expect(d.notify).not.toHaveBeenCalled();
  });
});

describe("rescheduleVisit", () => {
  it("moves the visit and tells the client, once per move", async () => {
    const d = deps();
    expect(
      await rescheduleVisit("link-token", "2030-10-03T09:00:00Z", d),
    ).toEqual({ ok: true, startsAt: "2030-10-03T09:00:00+00:00" });
    expect(d.reschedule).toHaveBeenCalledWith(
      "link-token",
      "2030-10-03T09:00:00Z",
    );
    expect(d.notify).toHaveBeenCalledWith({
      kind: "rescheduled",
      reference: "KS-1",
      manageToken: "link-token",
      sequence: 1,
    });
  });

  it("says why it could not move", async () => {
    const d = deps({
      reschedule: vi
        .fn()
        .mockRejectedValue(new BookingError("slot_unavailable", "taken")),
    });
    expect(await rescheduleVisit("t", "x", d)).toEqual({
      ok: false,
      code: "slot_unavailable",
    });
  });
});

describe("cancelVisitAsCentre", () => {
  it("gives all the money back; the e-mail brings a new link", async () => {
    const d = {
      ...deps(),
      centreCancel: vi.fn().mockResolvedValue({
        reference: "KS-1",
        refundMinor: 20000,
        paymentIntentId: "pi_1",
        rescheduleCount: 1,
      }),
    };
    expect(await cancelVisitAsCentre("visit-1", d)).toEqual({
      ok: true,
      refundMinor: 20000,
      refundFailed: false,
    });
    expect(d.refund).toHaveBeenCalledWith("pi_1", 20000, "KS-1");
    expect(d.notify).toHaveBeenCalledWith({
      kind: "cancelled",
      reference: "KS-1",
      manageToken: null,
      sequence: 2,
      refundMinor: 20000,
    });
  });

  it("refuses what the database refuses", async () => {
    const d = {
      ...deps(),
      centreCancel: vi
        .fn()
        .mockRejectedValue(new BookingError("not_cancellable", "no")),
    };
    expect(await cancelVisitAsCentre("visit-1", d)).toEqual({
      ok: false,
      code: "not_cancellable",
    });
  });
});
