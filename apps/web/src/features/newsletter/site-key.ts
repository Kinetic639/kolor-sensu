import { turnstileKeys } from "@/features/booking/guards";

/**
 * Turnstile's site key for the newsletter's forms; none (no form, rather
 * than a broken page) when production has no keys.
 */
export function newsletterSiteKey(): string | null {
  try {
    return turnstileKeys().siteKey;
  } catch {
    return null;
  }
}
