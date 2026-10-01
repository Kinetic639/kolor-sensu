import type { NotificationLike } from "@repo/scheduling";
import { renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLivePortal, type LiveSignals } from "./live-updates";

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sonner", () => ({ toast: vi.fn() }));

const notification: NotificationLike & { portal: "admin" } = {
  portal: "admin",
  id: 1,
  kind: "booked",
  actor: "payment",
  appointmentId: "visit-1",
  createdAt: "2026-10-01T08:05:00+00:00",
  readAt: null,
  details: {
    reference: "2610-004",
    startsAt: "2026-10-03T09:00:00+00:00",
    mode: "online",
    clientName: "Jan Kowalski",
    serviceName: "Konsultacja",
    specialistName: null,
    fromStartsAt: null,
    reason: null,
    refundMinor: null,
    refundDueMinor: null,
    priceMinor: null,
    currencyCode: null,
  },
};

function listen() {
  let signals: LiveSignals | undefined;
  const stop = vi.fn();
  const subscribe = vi.fn((given: LiveSignals) => {
    signals = given;
    return stop;
  });
  const hook = renderHook(() =>
    useLivePortal({ channelKey: "user-1", portal: "admin", subscribe }),
  );
  return { signals: () => signals!, stop, subscribe, hook };
}

beforeEach(() => {
  vi.useFakeTimers();
  router.refresh.mockReset();
  router.push.mockReset();
  vi.mocked(toast).mockReset();
});
afterEach(() => vi.useRealTimers());

describe("useLivePortal", () => {
  it("reloads once for a burst of changes", () => {
    const { signals } = listen();
    signals().onVisits();
    signals().onVisits();
    signals().onReconnect();
    expect(router.refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("shows this portal's notification, with a way to its visit", () => {
    const { signals } = listen();
    signals().onNotification(notification);
    expect(toast).toHaveBeenCalledWith("Nowa wizyta", {
      description: expect.stringContaining("Jan Kowalski"),
      action: { label: "Zobacz", onClick: expect.any(Function) },
    });
    const { action } = vi.mocked(toast).mock.calls[0]![1] as unknown as {
      action: { onClick: () => void };
    };
    action.onClick();
    expect(router.push).toHaveBeenCalledWith(
      "/kalendarz?data=2026-10-03&wizyta=visit-1",
    );
    vi.advanceTimersByTime(400);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("leaves the other portal's notifications to it", () => {
    const { signals } = listen();
    signals().onNotification({
      ...notification,
      portal: "specialist" as never,
    });
    expect(toast).not.toHaveBeenCalled();
  });

  it("stops listening when the page goes", () => {
    const { stop, hook } = listen();
    hook.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
