import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CMS_PREVIEW_TOKEN_TTL_SECONDS,
  isSafePreviewPath,
  previewEntryUrl,
  signPreviewToken,
  verifyPreviewToken,
} from "./cms-preview.js";

const secret = "a-test-secret-that-is-long-enough-0123456789";
const now = new Date("2026-10-19T12:00:00Z");

function later(seconds: number) {
  return new Date(now.getTime() + seconds * 1000);
}

describe("signPreviewToken / verifyPreviewToken", () => {
  it("round-trips the page's path", () => {
    const token = signPreviewToken({ path: "/gabinety", secret, now });
    expect(verifyPreviewToken(token, { secret, now })).toEqual({
      ok: true,
      path: "/gabinety",
    });
  });

  it("keeps a token good until it expires, then refuses it", () => {
    const token = signPreviewToken({ path: "/", secret, now });
    expect(
      verifyPreviewToken(token, {
        secret,
        now: later(CMS_PREVIEW_TOKEN_TTL_SECONDS - 1),
      }).ok,
    ).toBe(true);
    expect(
      verifyPreviewToken(token, {
        secret,
        now: later(CMS_PREVIEW_TOKEN_TTL_SECONDS + 1),
      }),
    ).toEqual({ ok: false, reason: "expired" });
  });

  it("is short-lived", () => {
    expect(CMS_PREVIEW_TOKEN_TTL_SECONDS).toBeLessThanOrEqual(300);
  });

  it("refuses a token signed with another secret", () => {
    const token = signPreviewToken({ path: "/", secret: "x".repeat(40), now });
    expect(verifyPreviewToken(token, { secret, now })).toEqual({
      ok: false,
      reason: "signature",
    });
  });

  it("refuses a token whose payload was changed", () => {
    const token = signPreviewToken({ path: "/", secret, now });
    const [version, , signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ path: "/kontakt", exp: 9_999_999_999 }),
    ).toString("base64url");
    expect(
      verifyPreviewToken(`${version}.${forged}.${signature}`, { secret, now }),
    ).toEqual({ ok: false, reason: "signature" });
  });

  it("refuses a token whose signature was changed", () => {
    const token = signPreviewToken({ path: "/", secret, now });
    const tampered = token.slice(0, -2) + (token.endsWith("A") ? "BB" : "AA");
    expect(verifyPreviewToken(tampered, { secret, now }).ok).toBe(false);
  });

  it("refuses malformed tokens", () => {
    for (const token of ["", "abc", "v1.abc", "v2.a.b", "v1..", "v1.a.b.c"]) {
      expect(verifyPreviewToken(token, { secret, now })).toEqual({
        ok: false,
        reason: "malformed",
      });
    }
  });

  it("refuses a correctly signed token for an unsafe path", () => {
    // Signed by hand, as a leaked secret would allow: still no redirect out.
    const payload = Buffer.from(
      JSON.stringify({ path: "//evil.example", exp: 9_999_999_999 }),
    ).toString("base64url");
    const signature = createHmac("sha256", secret)
      .update(`v1.${payload}`)
      .digest("base64url");
    expect(
      verifyPreviewToken(`v1.${payload}.${signature}`, { secret, now }),
    ).toEqual({ ok: false, reason: "path" });
  });

  it("refuses to sign without a secret or for an unsafe path", () => {
    expect(() => signPreviewToken({ path: "/", secret: "", now })).toThrow();
    expect(() =>
      signPreviewToken({ path: "https://evil.example", secret, now }),
    ).toThrow();
  });

  it("refuses to verify without a secret", () => {
    const token = signPreviewToken({ path: "/", secret, now });
    expect(verifyPreviewToken(token, { secret: "", now }).ok).toBe(false);
  });
});

describe("isSafePreviewPath", () => {
  it("accepts the site's own paths", () => {
    for (const path of [
      "/",
      "/gabinety",
      "/oferta/terapia-par",
      "/umow-wizyte?usluga=konsultacja",
    ]) {
      expect(isSafePreviewPath(path)).toBe(true);
    }
  });

  it("refuses anything that could lead off the site", () => {
    for (const path of [
      "",
      "gabinety",
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "https://evil.example",
      "javascript:alert(1)",
      "/ space",
      "/line\nbreak",
      "/tab\tx",
      `/${"a".repeat(600)}`,
    ]) {
      expect(isSafePreviewPath(path)).toBe(false);
    }
  });
});

describe("previewEntryUrl", () => {
  it("points at the site's preview entry with the token", () => {
    const url = previewEntryUrl("https://ks-dev.example.invalid", "v1.a.b");
    expect(url).toBe("https://ks-dev.example.invalid/api/preview?token=v1.a.b");
  });
});
