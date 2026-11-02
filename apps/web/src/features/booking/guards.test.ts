import { describe, expect, it, vi } from "vitest";
import {
  E2E_KEY_HEADER,
  TURNSTILE_TEST_KEYS,
  clientIp,
  holdKey,
  isEndToEndRun,
  turnstileKeys,
  verifyTurnstile,
  visitorKey,
} from "./guards";

describe("clientIp", () => {
  it("takes the first address the proxy saw, else the real IP header", () => {
    expect(
      clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })),
    ).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2",
    );
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("visitorKey", () => {
  it("is the same for one address and never the address itself", () => {
    const key = visitorKey("203.0.113.7", "secret");
    expect(key).toBe(visitorKey("203.0.113.7", "secret"));
    expect(key).not.toBe(visitorKey("203.0.113.8", "secret"));
    expect(key).not.toBe(visitorKey("203.0.113.7", "other secret"));
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("holdKey", () => {
  const key = "k".repeat(32);
  const env = { SUPABASE_SECRET_KEY: "secret", E2E_BYPASS_KEY: key };
  const from = (extra: Record<string, string> = {}) =>
    new Headers({ "x-forwarded-for": "203.0.113.7", ...extra });

  it("is the visitor's address key", () => {
    expect(holdKey(from(), env)).toBe(visitorKey("203.0.113.7", "secret"));
  });

  it("is fresh each time for an end-to-end run with the key", () => {
    const run = from({ [E2E_KEY_HEADER]: key });
    expect(isEndToEndRun(run, env)).toBe(true);
    const first = holdKey(run, env);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toBe(holdKey(run, env));
    expect(first).not.toBe(visitorKey("203.0.113.7", "secret"));
  });

  it("ignores a wrong key, and any key where none is set (production)", () => {
    const address = visitorKey("203.0.113.7", "secret");
    expect(holdKey(from({ [E2E_KEY_HEADER]: "k".repeat(31) }), env)).toBe(
      address,
    );
    expect(holdKey(from({ [E2E_KEY_HEADER]: "" }), env)).toBe(address);
    expect(
      isEndToEndRun(from({ [E2E_KEY_HEADER]: key }), {
        ...env,
        E2E_BYPASS_KEY: undefined,
      }),
    ).toBe(false);
    expect(
      isEndToEndRun(from({ [E2E_KEY_HEADER]: "short" }), {
        E2E_BYPASS_KEY: "short",
      }),
    ).toBe(false);
  });
});

describe("turnstileKeys", () => {
  it("uses Cloudflare's always-passing test keys outside production", () => {
    expect(turnstileKeys({ NODE_ENV: "development" })).toEqual(
      TURNSTILE_TEST_KEYS,
    );
  });

  it("uses the configured keys", () => {
    expect(
      turnstileKeys({
        NODE_ENV: "production",
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site",
        TURNSTILE_SECRET_KEY: "secret",
      }),
    ).toEqual({ siteKey: "site", secretKey: "secret" });
  });

  it("refuses to run production without keys", () => {
    expect(() => turnstileKeys({ NODE_ENV: "production" })).toThrow(
      /Turnstile/,
    );
  });
});

describe("verifyTurnstile", () => {
  it("asks Cloudflare with the secret, the token and the visitor's IP", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ success: true })));
    expect(
      await verifyTurnstile("token", "203.0.113.7", "secret", fetcher),
    ).toBe(true);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
      secret: "secret",
      response: "token",
      remoteip: "203.0.113.7",
    });
  });

  it("fails closed: no token, a refusal or no answer", async () => {
    const refuse = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ success: false })));
    const broken = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await verifyTurnstile("", "ip", "secret", refuse)).toBe(false);
    expect(refuse).not.toHaveBeenCalled();
    expect(await verifyTurnstile("token", "ip", "secret", refuse)).toBe(false);
    expect(await verifyTurnstile("token", "ip", "secret", broken)).toBe(false);
  });
});
