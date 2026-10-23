import { describe, expect, it, vi } from "vitest";
import {
  listNotifications,
  markNotificationUnread,
  markNotificationsRead,
  subscribeToPortalUpdates,
  toPortalNotification,
} from "./notifications";

const row = {
  id: 7,
  kind: "cancelled",
  actor: "client",
  appointment_id: "visit-1",
  created_at: "2026-10-01T20:51:56+00:00",
  read_at: null,
  details: {
    reference: "2610-004",
    starts_at: "2026-10-03T09:00:00+00:00",
    mode: "online",
    client_name: "Jan Kowalski",
    service_name: "Konsultacja",
    specialist_name: "Michał Stępień",
    refund_due_minor: 0,
    price_minor: 20000,
    currency_code: "PLN",
  },
};

describe("toPortalNotification", () => {
  it("reads a row (or a live signal's payload)", () => {
    expect(toPortalNotification(row)).toEqual({
      id: 7,
      kind: "cancelled",
      actor: "client",
      appointmentId: "visit-1",
      createdAt: "2026-10-01T20:51:56+00:00",
      readAt: null,
      details: {
        reference: "2610-004",
        startsAt: "2026-10-03T09:00:00+00:00",
        mode: "online",
        clientName: "Jan Kowalski",
        serviceName: "Konsultacja",
        specialistName: "Michał Stępień",
        specialistId: null,
        fromStartsAt: null,
        reason: null,
        refundMinor: null,
        refundDueMinor: 0,
        priceMinor: 20000,
        amountMinor: null,
        disputeStatus: null,
        disputeReason: null,
        currencyCode: "PLN",
        workshopId: null,
      },
    });
  });

  it("a dispute: its amount, Stripe's status and reason", () => {
    const n = toPortalNotification({
      ...row,
      kind: "disputed",
      actor: "payment",
      details: {
        reference: "2610-004",
        amount_minor: 20000,
        dispute_status: "needs_response",
        dispute_reason: "fraudulent",
      },
    });
    expect(n.details).toMatchObject({
      amountMinor: 20000,
      disputeStatus: "needs_response",
      disputeReason: "fraudulent",
    });
  });

  it("a profile sent for review: whose, with no booking", () => {
    const n = toPortalNotification({
      ...row,
      kind: "profile_submitted",
      actor: "specialist",
      appointment_id: null,
      details: { specialist_id: "anna", specialist_name: "Anna Kłobuchowska" },
    });
    expect(n).toMatchObject({
      kind: "profile_submitted",
      actor: "specialist",
      appointmentId: null,
      details: { specialistId: "anna", specialistName: "Anna Kłobuchowska" },
    });
  });

  it("keeps a specialist's (no money) and odd values safe", () => {
    const n = toPortalNotification({
      ...row,
      details: { reference: 12, price_minor: "200" },
    });
    expect(n.details).toMatchObject({
      reference: null,
      priceMinor: null,
      currencyCode: null,
    });
  });
});

function queryClient(rows: unknown[], unread: number) {
  const calls: string[] = [];
  const builder = (result: unknown) => {
    const chain: Record<string, unknown> = {};
    for (const name of ["select", "eq", "is", "order", "limit"]) {
      chain[name] = vi.fn((...args: unknown[]) => {
        calls.push(`${name}(${args.map((a) => JSON.stringify(a)).join(",")})`);
        return chain;
      });
    }
    chain.then = (resolve: (value: unknown) => void) => resolve(result);
    return chain;
  };
  const from = vi
    .fn()
    .mockReturnValueOnce(builder({ data: rows, error: null }))
    .mockReturnValueOnce(builder({ count: unread, error: null }));
  return { client: { from } as never, calls, from };
}

describe("listNotifications", () => {
  it("gives the portal's latest and how many are unread", async () => {
    const { client, calls, from } = queryClient([row], 3);
    expect(await listNotifications(client, "admin", 20)).toEqual({
      items: [toPortalNotification(row)],
      unreadCount: 3,
    });
    expect(from).toHaveBeenCalledWith("notifications");
    expect(calls).toContain('eq("portal","admin")');
    expect(calls).toContain('order("created_at",{"ascending":false})');
    expect(calls).toContain("limit(20)");
    expect(calls).toContain('is("read_at",null)');
  });
});

describe("markNotificationUnread", () => {
  it("puts one back to unread", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    expect(await markNotificationUnread({ rpc } as never, 7)).toBe(true);
    expect(rpc).toHaveBeenCalledWith("mark_notification_unread", { p_id: 7 });
  });
});

describe("markNotificationsRead", () => {
  it("reads the portal's inbox", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 2, error: null });
    expect(await markNotificationsRead({ rpc } as never, "specialist")).toBe(2);
    expect(rpc).toHaveBeenCalledWith("mark_notifications_read", {
      p_portal: "specialist",
    });
  });

  it("throws what the database says", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error("x") });
    await expect(
      markNotificationsRead({ rpc } as never, "admin"),
    ).rejects.toThrow("x");
  });
});

function realtimeClient() {
  const handlers: Record<string, (message: { payload: unknown }) => void> = {};
  let onStatus: (status: string) => void = () => undefined;
  const channel = {
    on: vi.fn((_type: string, filter: { event: string }, handler: never) => {
      handlers[filter.event] = handler;
      return channel;
    }),
    subscribe: vi.fn((callback: (status: string) => void) => {
      onStatus = callback;
      return channel;
    }),
  };
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn().mockResolvedValue("ok"),
    realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
  };
  return {
    client,
    channel,
    emit: (event: string, payload: unknown) => handlers[event]!({ payload }),
    status: (status: string) => onStatus(status),
  };
}

describe("subscribeToPortalUpdates", () => {
  it("hears the person's own private channel, signed in", async () => {
    const live = realtimeClient();
    const onVisits = vi.fn();
    const onNotification = vi.fn();
    const onReconnect = vi.fn();
    const stop = subscribeToPortalUpdates(live.client as never, "user-1", {
      onVisits,
      onNotification,
      onReconnect,
    });
    expect(live.client.channel).toHaveBeenCalledWith("user:user-1", {
      config: { private: true },
    });
    await vi.waitFor(() => expect(live.channel.subscribe).toHaveBeenCalled());
    expect(live.client.realtime.setAuth).toHaveBeenCalled();

    live.emit("visits", { appointment_id: "visit-1" });
    expect(onVisits).toHaveBeenCalledTimes(1);
    live.emit("notification", { ...row, portal: "admin" });
    expect(onNotification).toHaveBeenCalledWith({
      ...toPortalNotification(row),
      portal: "admin",
    });

    // The first join is no news; joining again after a drop is.
    live.status("SUBSCRIBED");
    expect(onReconnect).not.toHaveBeenCalled();
    live.status("CHANNEL_ERROR");
    live.status("SUBSCRIBED");
    expect(onReconnect).toHaveBeenCalledTimes(1);

    stop();
    expect(live.client.removeChannel).toHaveBeenCalledWith(live.channel);
  });

  it("stopped before signing in: never subscribes", async () => {
    const live = realtimeClient();
    const stop = subscribeToPortalUpdates(live.client as never, "user-1", {
      onVisits: vi.fn(),
      onNotification: vi.fn(),
    });
    stop();
    await Promise.resolve();
    await Promise.resolve();
    expect(live.channel.subscribe).not.toHaveBeenCalled();
  });
});
