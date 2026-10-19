import { createHmac, timingSafeEqual } from "node:crypto";

// Server-side only: it holds CMS_PREVIEW_SECRET. The admin portal signs a
// short-lived token naming one page of the site; the site's /api/preview
// checks it, turns Draft Mode on and sends the browser to that page (see
// docs/architecture/cms-domain.md, "Preview on the site").
//
// A token is `v1.<payload>.<signature>`: the payload is base64url JSON
// { path, exp } (exp in seconds since the epoch) and the signature an
// HMAC-SHA256 of `v1.<payload>` with the shared secret, both base64url.

/** How long a token works: it is made on the click that uses it. */
export const CMS_PREVIEW_TOKEN_TTL_SECONDS = 120;

const VERSION = "v1";
const MAX_PATH_LENGTH = 512;
// A path on the site, with an optional query: no scheme, no host, no
// backslash, no spaces or control characters.
const SAFE_PATH = /^\/(?![/\\])[A-Za-z0-9\-._~!$&'()*+,;=:@%/?]*$/;
const PROBE_ORIGIN = "https://preview.invalid";

/** True for a path within the site that a redirect may safely go to. */
export function isSafePreviewPath(path: unknown): path is string {
  if (typeof path !== "string" || path.length > MAX_PATH_LENGTH) return false;
  if (!SAFE_PATH.test(path)) return false;
  try {
    return new URL(path, PROBE_ORIGIN).origin === PROBE_ORIGIN;
  } catch {
    return false;
  }
}

function sign(secret: string, data: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

/** A token that opens `path` on the site in preview, for a short while. */
export function signPreviewToken({
  path,
  secret,
  now = new Date(),
  ttlSeconds = CMS_PREVIEW_TOKEN_TTL_SECONDS,
}: {
  path: string;
  secret: string;
  now?: Date;
  ttlSeconds?: number;
}): string {
  if (!secret) throw new Error("CMS_PREVIEW_SECRET is not configured");
  if (!isSafePreviewPath(path)) throw new Error("Unsafe preview path");
  const exp = Math.floor(now.getTime() / 1000) + ttlSeconds;
  const payload = Buffer.from(JSON.stringify({ path, exp })).toString(
    "base64url",
  );
  return `${VERSION}.${payload}.${sign(secret, `${VERSION}.${payload}`)}`;
}

export type PreviewTokenCheck =
  | { ok: true; path: string }
  | { ok: false; reason: "malformed" | "signature" | "expired" | "path" };

/** Checks a token's signature, expiry and path. */
export function verifyPreviewToken(
  token: string,
  { secret, now = new Date() }: { secret: string; now?: Date },
): PreviewTokenCheck {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [version, payload, signature] = parts as [string, string, string];
  if (version !== VERSION || !payload || !signature) {
    return { ok: false, reason: "malformed" };
  }
  if (!secret) return { ok: false, reason: "signature" };

  const expected = Buffer.from(sign(secret, `${version}.${payload}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: "signature" };
  }

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const { path, exp } = (claims ?? {}) as { path?: unknown; exp?: unknown };
  if (typeof exp !== "number" || !Number.isInteger(exp)) {
    return { ok: false, reason: "malformed" };
  }
  if (exp * 1000 <= now.getTime()) return { ok: false, reason: "expired" };
  if (!isSafePreviewPath(path)) return { ok: false, reason: "path" };
  return { ok: true, path };
}

/** The site's address that turns the preview on with `token`. */
export function previewEntryUrl(webUrl: string, token: string): string {
  const url = new URL("/api/preview", webUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
