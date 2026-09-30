import { describe, expect, it, vi } from "vitest";
import { BookingError } from "./booking";
import {
  cancelBooking,
  listRescheduleSlots,
  rescheduleBooking,
} from "./booking-changes";

function rpcClient(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { client: { rpc } as never, rpc };
}

describe("cancelBooking", () => {
  it("cancels by the link token and says what to refund, from which payment", async () => {
    const { client, rpc } = rpcClient([
      {
        reference: "KS-20301002-1534",
        refund_minor: 25000,
        payment_intent_id: "pi_1",
      },
    ]);
    expect(await cancelBooking(client, "link-token")).toEqual({
      reference: "KS-20301002-1534",
      refundMinor: 25000,
      paymentIntentId: "pi_1",
    });
    expect(rpc).toHaveBeenCalledWith("cancel_booking", {
      p_manage_token: "link-token",
    });
  });

  it("says when the visit cannot be cancelled any more", async () => {
    const { client } = rpcClient(null, {
      message: "This visit cannot be cancelled",
      hint: "not_cancellable",
    });
    await expect(cancelBooking(client, "link-token")).rejects.toMatchObject({
      name: "BookingError",
      code: "not_cancellable",
    });
  });
});

describe("listRescheduleSlots", () => {
  it("asks for a week of times the visit may move to", async () => {
    const slot = {
      starts_at: "2030-10-02T09:00:00+00:00",
      ends_at: "2030-10-02T09:50:00+00:00",
    };
    const { client, rpc } = rpcClient([slot]);
    expect(
      await listRescheduleSlots(client, "link-token", {
        from: "2030-09-30",
        to: "2030-10-06",
      }),
    ).toEqual([slot]);
    expect(rpc).toHaveBeenCalledWith("list_reschedule_slots", {
      p_manage_token: "link-token",
      p_from: "2030-09-30",
      p_to: "2030-10-06",
    });
  });
});

describe("rescheduleBooking", () => {
  it("moves the visit and returns its new time", async () => {
    const { client, rpc } = rpcClient([
      {
        reference: "KS-20301002-1534",
        starts_at: "2030-10-03T09:00:00+00:00",
        ends_at: "2030-10-03T09:50:00+00:00",
        reschedule_count: 1,
      },
    ]);
    expect(
      await rescheduleBooking(client, "link-token", "2030-10-03T09:00:00Z"),
    ).toEqual({
      reference: "KS-20301002-1534",
      startsAt: "2030-10-03T09:00:00+00:00",
      endsAt: "2030-10-03T09:50:00+00:00",
      rescheduleCount: 1,
    });
    expect(rpc).toHaveBeenCalledWith("reschedule_booking", {
      p_manage_token: "link-token",
      p_starts_at: "2030-10-03T09:00:00Z",
    });
  });

  it("says why it could not move", async () => {
    for (const code of ["slot_unavailable", "not_reschedulable", "not_found"]) {
      const { client } = rpcClient(null, { message: "no", hint: code });
      const error = await rescheduleBooking(client, "t", "x").catch(
        (caught: unknown) => caught,
      );
      expect(error).toBeInstanceOf(BookingError);
      expect(error).toMatchObject({ code });
    }
  });
});
