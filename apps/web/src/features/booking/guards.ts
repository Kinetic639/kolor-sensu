import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

// Keeping bots from blocking the schedule (docs/product/booking-plan.md,
// R5): Cloudflare Turnstile before a time is held, and a limit on holds per
// visitor, counted by a keyed hash of their IP address (the database never
// sees the address itself).

/** Cloudflare's documented test keys: the widget always passes. */
export const TURNSTILE_TEST_KEYS = {
  siteKey: "1x00000000000000000000AA",
  secretKey: "1x0000000000000000000000000000000AA",
};

type Env = Record<string, string | undefined>;

export function turnstileKeys(env: Env = process.env) {
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secretKey = env.TURNSTILE_SECRET_KEY;
  if (siteKey && secretKey) return { siteKey, secretKey };
  if (env.NODE_ENV !== "production") return TURNSTILE_TEST_KEYS;
  throw new Error("Turnstile keys are not configured");
}

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Whether Cloudflare confirms the widget's token. Fails closed. */
export async function verifyTurnstile(
  token: string,
  ip: string,
  secretKey: string,
  fetcher: typeof fetch = fetch,
) {
  if (!token) return false;
  try {
    const response = await fetcher(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.error("[booking] Turnstile check failed:", error);
    return false;
  }
}

/** The visitor's address, as the proxy in front of the site saw it. */
export function clientIp(headers: Pick<Headers, "get">) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/** A visitor's key for the hold limit: HMAC-SHA256 of their address. */
export function visitorKey(ip: string, secret: string) {
  return createHmac("sha256", secret).update(ip).digest("hex");
}

/** The header the end-to-end tests send E2E_BYPASS_KEY in. */
export const E2E_KEY_HEADER = "x-e2e-key";

/**
 * Whether the request carries E2E_BYPASS_KEY: the end-to-end tests on DEV
 * and STAGING, which hold many times from one address. Production has no
 * such key, so nothing there ever is.
 */
export function isEndToEndRun(
  headers: Pick<Headers, "get">,
  env: Env = process.env,
) {
  const key = env.E2E_BYPASS_KEY;
  if (!key || key.length < 32) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(
    digest(headers.get(E2E_KEY_HEADER) ?? ""),
    digest(key),
  );
}

/**
 * The key the database counts a visitor's holds, unpaid reservations and
 * questionnaires by: their address's, or for an end-to-end run a fresh one
 * each time, so the tests do not use up one another's limits (the limits
 * themselves are tested in supabase/tests).
 */
export function holdKey(headers: Pick<Headers, "get">, env: Env = process.env) {
  const secret = env.SUPABASE_SECRET_KEY ?? "";
  return isEndToEndRun(headers, env)
    ? visitorKey(`e2e:${randomUUID()}`, secret)
    : visitorKey(clientIp(headers), secret);
}
