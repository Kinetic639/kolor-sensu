import { describe, expect, it, vi } from "vitest";
import { createReturnRefresher } from "./refresh-on-return.js";

function setup(minAwayMs = 30_000) {
  let now = 0;
  const refresh = vi.fn();
  const refresher = createReturnRefresher({
    refresh,
    minAwayMs,
    now: () => now,
  });
  return {
    refresh,
    refresher,
    wait: (ms: number) => {
      now += ms;
    },
  };
}

describe("createReturnRefresher", () => {
  it("refreshes when the page comes back after a while away", () => {
    const { refresh, refresher, wait } = setup();
    refresher.onVisibilityChange("hidden");
    wait(60_000);
    refresher.onVisibilityChange("visible");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh after a quick look elsewhere", () => {
    const { refresh, refresher, wait } = setup();
    refresher.onVisibilityChange("hidden");
    wait(5_000);
    refresher.onVisibilityChange("visible");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("ignores becoming visible without having been hidden", () => {
    const { refresh, refresher, wait } = setup();
    wait(60_000);
    refresher.onVisibilityChange("visible");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("counts each time away on its own", () => {
    const { refresh, refresher, wait } = setup();
    refresher.onVisibilityChange("hidden");
    wait(60_000);
    refresher.onVisibilityChange("visible");
    refresher.onVisibilityChange("hidden");
    wait(1_000);
    refresher.onVisibilityChange("visible");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
