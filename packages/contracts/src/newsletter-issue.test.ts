import { describe, expect, it } from "vitest";
import {
  emptyNewsletterIssue,
  newsletterIssueDraftSchema,
  newsletterIssueProblems,
  newsletterIssueRequestSchema,
  newsletterIssueState,
  newsletterItemSchema,
} from "./newsletter-issue";
import type { RichTextDocument } from "./rich-text";

const paragraph = (text: string): RichTextDocument => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("newsletter issue draft", () => {
  it("accepts an empty draft, kept in the archive", () => {
    const draft = emptyNewsletterIssue();
    expect(newsletterIssueDraftSchema.parse(draft)).toEqual(draft);
    expect(draft.inArchive).toBe(true);
  });

  it("names what is missing before sending", () => {
    expect(newsletterIssueProblems(emptyNewsletterIssue())).toEqual([
      "Wpisz temat wydania.",
      "Napisz wstęp albo dodaj choć jedną kartę.",
    ]);
    expect(
      newsletterIssueProblems({
        ...emptyNewsletterIssue(),
        subject: "Listopad",
        intro: paragraph("Dzień dobry"),
      }),
    ).toEqual([]);
    expect(
      newsletterIssueProblems({
        ...emptyNewsletterIssue(),
        subject: "Listopad",
        items: [{ kind: "article", id: "a1" }],
      }),
    ).toEqual([]);
  });

  it("caps the cards at twelve", () => {
    const items = Array.from({ length: 13 }, (_, i) => ({
      kind: "article" as const,
      id: `a${i}`,
    }));
    const parsed = newsletterIssueDraftSchema.safeParse({
      ...emptyNewsletterIssue(),
      items,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("newsletter items", () => {
  it("takes an own card with a site path, a https link or none", () => {
    for (const href of ["/warsztaty", "https://example.invalid/x", ""]) {
      expect(
        newsletterItemSchema.safeParse({
          kind: "card",
          title: "Warsztaty",
          text: "",
          href,
          label: "",
        }).success,
      ).toBe(true);
    }
  });

  it("refuses a card without a title or with an unsafe link", () => {
    expect(
      newsletterItemSchema.safeParse({
        kind: "card",
        title: " ",
        text: "",
        href: "",
        label: "",
      }).success,
    ).toBe(false);
    expect(
      newsletterItemSchema.safeParse({
        kind: "card",
        title: "Warsztaty",
        text: "",
        href: "javascript:alert(1)",
        label: "",
      }).success,
    ).toBe(false);
  });
});

describe("newsletter issue state", () => {
  const now = new Date("2026-11-01T10:00:00Z");

  it("calls a sent issue whose time is ahead scheduled", () => {
    expect(
      newsletterIssueState(
        { status: "sent", sendAt: "2026-11-02T08:00:00Z" },
        now,
      ),
    ).toBe("scheduled");
    expect(
      newsletterIssueState(
        { status: "sent", sendAt: "2026-10-30T08:00:00Z" },
        now,
      ),
    ).toBe("sent");
    expect(newsletterIssueState({ status: "draft", sendAt: null }, now)).toBe(
      "draft",
    );
    expect(newsletterIssueState({ status: "sending", sendAt: null }, now)).toBe(
      "sending",
    );
  });
});

describe("the portal's request to the site", () => {
  it("knows each action", () => {
    const draft = emptyNewsletterIssue();
    const id = "8f14e45f-ceea-4e7a-9d8b-0c3e5f2a1b7d";
    expect(
      newsletterIssueRequestSchema.safeParse({ action: "preview", draft })
        .success,
    ).toBe(true);
    expect(
      newsletterIssueRequestSchema.safeParse({ action: "test", draft }).success,
    ).toBe(true);
    expect(
      newsletterIssueRequestSchema.safeParse({
        action: "send",
        id,
        sendAt: null,
      }).success,
    ).toBe(true);
    expect(
      newsletterIssueRequestSchema.safeParse({
        action: "send",
        id,
        sendAt: "2026-11-02T08:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      newsletterIssueRequestSchema.safeParse({ action: "cancel", id }).success,
    ).toBe(true);
    expect(
      newsletterIssueRequestSchema.safeParse({ action: "send", id: "x" })
        .success,
    ).toBe(false);
  });
});
