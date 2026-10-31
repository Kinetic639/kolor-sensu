// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Back from Stripe before its word came (Klient · 4, card 11): the return
// page asks the server again and again, by itself, until the payment is
// settled; the server asks Stripe each time (settleSession).

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { RefreshWhileWaiting } = await import("./refresh-while-waiting");

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  router.refresh.mockClear();
});

describe("RefreshWhileWaiting", () => {
  it("reads the page again every few seconds while the payment is on its way", () => {
    render(<RefreshWhileWaiting />);
    expect(router.refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(router.refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(router.refresh).toHaveBeenCalledTimes(3);
  });

  it("stops once the page no longer waits (the payment settled)", () => {
    const { unmount } = render(<RefreshWhileWaiting seconds={2} />);
    vi.advanceTimersByTime(2000);
    unmount();
    vi.advanceTimersByTime(10_000);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
});
