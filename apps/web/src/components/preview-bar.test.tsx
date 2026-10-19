// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const draft = { isEnabled: false };
vi.mock("next/headers", () => ({ draftMode: async () => draft }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/gabinety",
  useRouter: () => ({ refresh }),
}));
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: vi.fn() }));
vi.mock("@/lib/supabase/secret", () => ({ createSecretClient: vi.fn() }));

const { PreviewBar } = await import("./preview-bar");
const { PREVIEW_POLL_MS, PreviewBarView } = await import("./preview-bar-view");

function versions(...answers: (string | null)[]) {
  const fetch = vi.fn();
  for (const version of answers) {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ version }) });
  }
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ version: answers.at(-1) }),
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

beforeEach(() => {
  draft.isEnabled = false;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("PreviewBar", () => {
  it("renders nothing for a visitor", async () => {
    expect(await PreviewBar()).toBeNull();
  });

  it("shows the bar and asks not to be indexed in the preview", async () => {
    draft.isEnabled = true;
    versions("a");
    render(await PreviewBar());

    expect(
      screen.getByText("Podgląd szkicu — zmiany nie są opublikowane"),
    ).toBeVisible();
    expect(
      document.querySelector('meta[name="robots"]')?.getAttribute("content"),
    ).toBe("noindex, nofollow");
  });
});

describe("PreviewBarView", () => {
  it("ends the preview back on the same page", () => {
    versions("a");
    render(<PreviewBarView />);

    const button = screen.getByRole("button", { name: "Zakończ podgląd" });
    const form = button.closest("form")!;
    expect(form).toHaveAttribute("action", "/api/preview/exit");
    expect(form).toHaveAttribute("method", "post");
    expect(form.querySelector('input[name="sciezka"]')).toHaveValue(
      "/gabinety",
    );
  });

  it("refreshes the page when the content changes, not before", async () => {
    vi.useFakeTimers();
    const fetch = versions("a", "a", "b");
    render(<PreviewBarView />);

    await act(async () => {}); // the first answer: remembered
    expect(fetch).toHaveBeenCalledWith("/api/preview/version", {
      cache: "no-store",
    });
    await act(() => vi.advanceTimersByTimeAsync(PREVIEW_POLL_MS));
    expect(refresh).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(PREVIEW_POLL_MS));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps quiet when the route cannot answer", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetch);
    render(<PreviewBarView />);

    await act(() => vi.advanceTimersByTimeAsync(PREVIEW_POLL_MS * 3));
    expect(fetch).toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("stops asking once it is gone", async () => {
    vi.useFakeTimers();
    const fetch = versions("a");
    const { unmount } = render(<PreviewBarView />);
    await act(async () => {});
    unmount();
    const calls = fetch.mock.calls.length;

    await vi.advanceTimersByTimeAsync(PREVIEW_POLL_MS * 3);
    expect(fetch.mock.calls.length).toBe(calls);
  });
});
