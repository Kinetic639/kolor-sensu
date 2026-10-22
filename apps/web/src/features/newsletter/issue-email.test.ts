import type { RichTextDocument } from "@repo/contracts/rich-text";
import { describe, expect, it } from "vitest";
import {
  newsletterUnsubscribeUrl,
  newsletterIssueText,
  renderNewsletterIssue,
  type NewsletterIssueEmailContent,
} from "./issue-email";
import { newsletterCards } from "./issue-items";

const doc = (text: string): RichTextDocument => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const content: NewsletterIssueEmailContent = {
  subject: "Listopad w Kolor Sensu",
  previewText: "Warsztaty i dwa artykuły",
  number: 2,
  intro: doc("Dzień dobry!"),
  cards: newsletterCards(
    [
      { kind: "article", id: "gone" },
      {
        kind: "card",
        title: "Warsztaty dla rodziców",
        text: "Sobota, 10:00",
        href: "/warsztaty",
        label: "",
      },
    ],
    {
      articles: [],
      ebooks: [],
      imageUrl: (path) => path,
      origin: "https://ks.example.invalid",
    },
  ),
  closing: doc("Do zobaczenia"),
};

const UNSUBSCRIBE = newsletterUnsubscribeUrl("https://ks.example.invalid");

const options = {
  origin: "https://ks.example.invalid",
  unsubscribeUrl: UNSUBSCRIBE,
  webUrl: "https://ks.example.invalid/newsletter/2",
  company: null,
};

describe("an issue's cards", () => {
  it("leaves out what is no longer published, makes site links absolute", () => {
    expect(content.cards).toHaveLength(1);
    expect(content.cards[0]).toMatchObject({
      eyebrow: "Z centrum",
      href: "https://ks.example.invalid/warsztaty",
      label: "Dowiedz się więcej",
    });
  });
});

describe("the issue's e-mail", () => {
  it("writes the text version with the unsubscribe link", () => {
    const text = newsletterIssueText(content, options);
    expect(text).toContain("Newsletter nr 2");
    expect(text).toContain("Dzień dobry!");
    expect(text).toContain(
      "Dowiedz się więcej: https://ks.example.invalid/warsztaty",
    );
    expect(text).toContain(`Wypisz się z newslettera: ${UNSUBSCRIBE}`);
  });

  it("links to the site's unsubscribe page with the contact's code", async () => {
    expect(UNSUBSCRIBE).toBe(
      "https://ks.example.invalid/newsletter/wypisz?kod={{{contact.unsubscribe_token}}}",
    );
  });

  it("renders the HTML with the unsubscribe link", async () => {
    const rendered = await renderNewsletterIssue(content, options);
    expect(rendered.subject).toBe("Listopad w Kolor Sensu");
    expect(rendered.html).toContain(UNSUBSCRIBE);
    expect(rendered.html).toContain("Warsztaty dla rodziców");
  });

  it("has no unsubscribe link in a test", async () => {
    const rendered = await renderNewsletterIssue(content, {
      ...options,
      unsubscribeUrl: null,
    });
    expect(rendered.html).not.toContain(UNSUBSCRIBE);
    expect(rendered.text).not.toContain("Wypisz się");
  });
});
