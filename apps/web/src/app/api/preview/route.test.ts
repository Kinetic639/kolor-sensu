import { signPreviewToken } from "@repo/app-runtime/cms-preview";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Draft Mode itself is Next's: here its switch is a stand-in the tests read.
const draft = { isEnabled: false, enable: vi.fn(), disable: vi.fn() };
vi.mock("next/headers", () => ({ draftMode: async () => draft }));
const getVersion = vi.fn();
vi.mock("@/lib/supabase/secret", () => ({ createSecretClient: () => ({}) }));
vi.mock("@repo/supabase", () => ({
  getSiteContentDraftVersion: (...args: unknown[]) => getVersion(...args),
  readSiteContentDraft: vi.fn(),
  withSiteContentDrafts: vi.fn(),
}));

const enter = await import("./route");
const exit = await import("./exit/route");
const version = await import("./version/route");

const secret = "a-test-secret-that-is-long-enough-0123456789";

function entry(token: string) {
  return new Request(
    `https://ks.example.invalid/api/preview?token=${encodeURIComponent(token)}`,
  );
}

beforeEach(() => {
  vi.stubEnv("CMS_PREVIEW_SECRET", secret);
  draft.isEnabled = false;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /api/preview", () => {
  it("turns the preview on and goes to the token's page", async () => {
    const token = signPreviewToken({ path: "/gabinety", secret });
    const response = await enter.GET(entry(token));

    expect(draft.enable).toHaveBeenCalledOnce();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/gabinety");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses a token signed with another secret", async () => {
    const token = signPreviewToken({ path: "/", secret: "y".repeat(40) });
    const response = await enter.GET(entry(token));

    expect(response.status).toBe(401);
    expect(draft.enable).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
  });

  it("refuses an expired token", async () => {
    const token = signPreviewToken({
      path: "/",
      secret,
      now: new Date(Date.now() - 10 * 60 * 1000),
    });
    const response = await enter.GET(entry(token));

    expect(response.status).toBe(401);
    expect(await response.text()).toContain("wygasł");
    expect(draft.enable).not.toHaveBeenCalled();
  });

  it("refuses a missing token", async () => {
    const response = await enter.GET(
      new Request("https://ks.example.invalid/api/preview"),
    );
    expect(response.status).toBe(401);
    expect(draft.enable).not.toHaveBeenCalled();
  });

  it("refuses everything when the secret is not configured", async () => {
    const token = signPreviewToken({ path: "/", secret });
    vi.stubEnv("CMS_PREVIEW_SECRET", "");
    const response = await enter.GET(entry(token));

    expect(response.status).toBe(500);
    expect(draft.enable).not.toHaveBeenCalled();
  });
});

describe("/api/preview/exit", () => {
  function form(path: string) {
    const body = new FormData();
    body.set("sciezka", path);
    return new Request("https://ks.example.invalid/api/preview/exit", {
      method: "POST",
      body,
    });
  }

  it("turns the preview off and goes back to the page", async () => {
    const response = await exit.POST(form("/gabinety"));

    expect(draft.disable).toHaveBeenCalledOnce();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/gabinety");
  });

  it("never goes off the site", async () => {
    for (const path of ["//evil.example", "https://evil.example", "x"]) {
      const response = await exit.POST(form(path));
      expect(response.headers.get("location")).toBe("/");
    }
    const response = await exit.GET(
      new Request(
        "https://ks.example.invalid/api/preview/exit?sciezka=%2F%2Fevil.example",
      ),
    );
    expect(response.headers.get("location")).toBe("/");
    expect(draft.disable).toHaveBeenCalled();
  });
});

describe("GET /api/preview/version", () => {
  it("says nothing outside the preview", async () => {
    const response = await version.GET();

    expect(response.status).toBe(401);
    expect(getVersion).not.toHaveBeenCalled();
  });

  it("tells the preview when the content last changed", async () => {
    draft.isEnabled = true;
    getVersion.mockResolvedValue("2026-10-19T12:00:00+00:00");
    const response = await version.GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      version: "2026-10-19T12:00:00+00:00",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 503 when the database cannot be read", async () => {
    draft.isEnabled = true;
    getVersion.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await version.GET();
    expect(response.status).toBe(503);
  });
});
