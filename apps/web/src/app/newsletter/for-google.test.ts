import { describe, expect, it, vi } from "vitest";

// The newsletter's pages as Google and other sites see them: an issue is
// titled "subject · Newsletter nr N" at its own address; the pages behind
// the e-mails' links (confirming, unsubscribing) carry a secret in their
// address, so they are never indexed and never pass it on as a referrer.

vi.mock("@/lib/newsletter-data", () => ({
  getNewsletterArchiveIssue: async (number: number) =>
    number === 3
      ? {
          number: 3,
          subject: "Jesień w Kolor Sensu",
          previewText: "Nowe artykuły i warsztat o uważności.",
          sendAt: "2026-10-22T08:00:00Z",
        }
      : null,
}));
vi.mock("@/lib/education-data", () => ({
  articleImageUrl: () => "",
  getArticles: async () => [],
  getEbooks: async () => [],
}));
vi.mock("@/lib/supabase/secret", () => ({ createSecretClient: () => ({}) }));
vi.mock("@repo/supabase/newsletter", () => ({
  findNewsletterUnsubscribe: vi.fn(),
}));
vi.mock("@/features/newsletter/actions", () => ({}));

const issue = await import("./[numer]/page");
const confirm = await import("./potwierdz/page");
const unsubscribe = await import("./wypisz/page");

describe("the newsletter for Google", () => {
  it("titles an issue with its subject and number, at its own address", async () => {
    const metadata = await issue.generateMetadata({
      params: Promise.resolve({ numer: "3" }),
    } as never);
    expect(metadata).toMatchObject({
      title: "Jesień w Kolor Sensu · Newsletter nr 3",
      description: "Nowe artykuły i warsztat o uważności.",
      alternates: { canonical: "/newsletter/3" },
    });
  });

  it("keeps the pages behind the e-mails' links out, and their address to themselves", () => {
    for (const page of [confirm, unsubscribe]) {
      expect(page.metadata).toMatchObject({
        robots: { index: false, follow: false },
        referrer: "no-referrer",
      });
    }
  });
});
