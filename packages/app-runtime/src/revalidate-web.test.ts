import { afterEach, describe, expect, it, vi } from "vitest";
import { revalidateWeb } from "./revalidate-web.js";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("revalidateWeb", () => {
  it("posts every target to the site with the shared secret", async () => {
    vi.stubEnv("CMS_REVALIDATE_SECRET", "s3cret");
    vi.stubEnv("NEXT_PUBLIC_WEB_URL", "https://kolorsensu.pl");
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);

    await revalidateWeb([{ path: "/cennik" }, { path: "/", type: "layout" }]);

    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, init] = fetch.mock.calls[1]!;
    expect(String(url)).toBe("https://kolorsensu.pl/api/revalidate");
    expect(init).toMatchObject({
      method: "POST",
      headers: { authorization: "Bearer s3cret" },
      body: JSON.stringify({ path: "/", type: "layout" }),
    });
  });

  it("skips quietly without a secret", async () => {
    vi.stubEnv("CMS_REVALIDATE_SECRET", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await revalidateWeb([{ path: "/" }]);

    expect(fetch).not.toHaveBeenCalled();
  });

  it("never throws when the site does not answer", async () => {
    vi.stubEnv("CMS_REVALIDATE_SECRET", "s3cret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(revalidateWeb([{ path: "/" }])).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
