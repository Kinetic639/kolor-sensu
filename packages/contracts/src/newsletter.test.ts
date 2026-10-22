import { describe, expect, it } from "vitest";
import {
  countNewsletterStatuses,
  newsletterConsentText,
  newsletterCsv,
  newsletterSignupSchema,
  type NewsletterSubscriber,
} from "./newsletter";

const subscriber = (
  overrides: Partial<NewsletterSubscriber>,
): NewsletterSubscriber => ({
  id: "1",
  email: "ola@example.invalid",
  status: "active",
  source: "home",
  consentVersion: "2026-10-22",
  requestedAt: "2026-10-22T08:00:00Z",
  confirmedAt: "2026-10-22T08:05:00Z",
  stoppedAt: null,
  stopReason: null,
  synced: true,
  ...overrides,
});

describe("newsletterSignupSchema", () => {
  it("takes an address with the consent, trimmed", () => {
    expect(
      newsletterSignupSchema.parse({
        email: " ola@example.invalid ",
        consent: true,
        source: "footer",
      }),
    ).toEqual({
      email: "ola@example.invalid",
      consent: true,
      source: "footer",
    });
  });

  it("refuses a sign-up without the consent or with a wrong address", () => {
    const result = newsletterSignupSchema.safeParse({
      email: "ola",
      consent: false,
      source: "home",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      "email",
      "consent",
    ]);
  });

  it("refuses an unknown source", () => {
    expect(
      newsletterSignupSchema.safeParse({
        email: "ola@example.invalid",
        consent: true,
        source: "elsewhere",
      }).success,
    ).toBe(false);
  });
});

describe("newsletterConsentText", () => {
  it("names the controller and ends with the policy", () => {
    const text = newsletterConsentText("Kolor Sensu sp. z o.o.");
    expect(text).toContain(
      "Administratorem danych jest Kolor Sensu sp. z o.o.",
    );
    expect(text).toMatch(/Więcej w polityce prywatności\.$/);
  });
});

describe("countNewsletterStatuses", () => {
  it("counts each state", () => {
    expect(
      countNewsletterStatuses([
        { status: "active" },
        { status: "active" },
        { status: "pending" },
      ]),
    ).toEqual({ pending: 1, active: 2, unsubscribed: 0, removing: 0 });
  });
});

describe("newsletterCsv", () => {
  it("lists only the subscribed addresses, quoting what needs it", () => {
    const csv = newsletterCsv([
      subscriber({ email: "ola@example.invalid" }),
      subscriber({ id: "2", email: "ewa@example.invalid", status: "pending" }),
      subscriber({ id: "3", email: 'a"b@example.invalid', source: "footer" }),
      subscriber({ id: "4", email: "=x@example.invalid" }),
    ]);
    expect(csv.split("\n")).toEqual([
      "email,potwierdzono,zrodlo,wersja_zgody",
      "ola@example.invalid,2026-10-22T08:05:00Z,Strona główna,2026-10-22",
      '"a""b@example.invalid",2026-10-22T08:05:00Z,Stopka,2026-10-22',
      "'=x@example.invalid,2026-10-22T08:05:00Z,Strona główna,2026-10-22",
    ]);
  });
});
