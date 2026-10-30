// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Back in the wizard from a step with a time held (Klient · 2, card 5).

const actions = vi.hoisted(() => ({
  releaseOnReturnAction: vi.fn(async (): Promise<string | null> => null),
}));
const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("./actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { cameFromHeldStep, ReleaseOnReturn } =
  await import("./release-on-return");

function setResume(value: string) {
  document.cookie = `ks_rezerwacja=${encodeURIComponent(value)}; Path=/`;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.cookie = "ks_rezerwacja=; Path=/; Max-Age=0";
});

describe("cameFromHeldStep", () => {
  it("only the details and payment steps", () => {
    const cookies = (value: string) =>
      `a=1; ks_rezerwacja=${encodeURIComponent(value)}`;
    expect(cameFromHeldStep(cookies("/umow-wizyte/dane"))).toBe(true);
    expect(cameFromHeldStep(cookies("/umow-wizyte/platnosc"))).toBe(true);
    expect(cameFromHeldStep(cookies("/umow-wizyte?usluga=terapia"))).toBe(
      false,
    );
    expect(cameFromHeldStep(cookies("/umow-wizyte/danex"))).toBe(false);
    expect(cameFromHeldStep("a=1")).toBe(false);
  });
});

describe("ReleaseOnReturn", () => {
  it("gives the held time back, reads the free times again and says so", async () => {
    setResume("/umow-wizyte/dane");
    actions.releaseOnReturnAction.mockResolvedValue(
      "czwartek, 10 stycznia 2030, godz. 10:00",
    );
    render(<ReleaseOnReturn />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Po powrocie do wyboru terminu zwolniliśmy termin czwartek, 10 stycznia 2030, godz. 10:00.",
    );
    expect(actions.releaseOnReturnAction).toHaveBeenCalledTimes(1);
    expect(router.refresh).toHaveBeenCalled();
  });

  it("back twice: nothing was held, nothing is said", async () => {
    setResume("/umow-wizyte/dane");
    actions.releaseOnReturnAction.mockResolvedValue(null);
    render(<ReleaseOnReturn />);
    await waitFor(() =>
      expect(actions.releaseOnReturnAction).toHaveBeenCalled(),
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("asks nothing when the visitor did not come from a held time", () => {
    setResume("/umow-wizyte?usluga=terapia");
    render(<ReleaseOnReturn />);
    expect(actions.releaseOnReturnAction).not.toHaveBeenCalled();
  });
});
