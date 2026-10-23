import { describe, expect, it } from "vitest";
import {
  articleCategoryInputSchema,
  articleDraftSchema,
  ebookDraftSchema,
  emptyArticleDraft,
  emptyEbookDraft,
  publishProblem,
  slugFromTitle,
} from "./education";

// Edukacja's drafts: an empty one is valid (saved as a draft, not yet
// publishable), what is set is checked, a team article has no specialist
// author, links and films are safe, and the database's refusals read in
// Polish.

const id = "5b000000-0000-4000-8000-0000000000a1";

describe("an article's draft", () => {
  it("starts empty and valid, signed by the team", () => {
    const draft = emptyArticleDraft();
    expect(articleDraftSchema.parse(draft)).toEqual(draft);
    expect(draft.authorKind).toBe("team");
  });

  it("drops a specialist author once signed by the team", () => {
    expect(
      articleDraftSchema.parse({
        ...emptyArticleDraft(),
        authorKind: "team",
        authorSpecialistId: id,
      }).authorSpecialistId,
    ).toBeNull();
  });

  it("refuses a bad address, a cover from elsewhere, an unsafe source", () => {
    const draft = emptyArticleDraft();
    for (const patch of [
      { slug: "Zły Adres" },
      { coverPath: "https://x.pl/a.png" },
      { sources: [{ title: "Źródło", url: "javascript:alert(1)" }] },
      { serviceIds: ["nie-id"] },
    ]) {
      expect(articleDraftSchema.safeParse({ ...draft, ...patch }).success).toBe(
        false,
      );
    }
  });

  it("refuses a body with an image without its text", () => {
    expect(
      articleDraftSchema.safeParse({
        ...emptyArticleDraft(),
        body: {
          type: "doc",
          content: [
            {
              type: "articleImage",
              attrs: {
                src: "articles/0b8c2f2e-5c4f-4c0a-9a1e-3f6c2d1b7a90.webp",
                alt: "",
                width: 10,
                height: 10,
                caption: null,
                size: "text",
              },
            },
          ],
        },
      }).success,
    ).toBe(false);
  });
});

describe("an e-book's draft", () => {
  it("starts empty and valid", () => {
    expect(ebookDraftSchema.parse(emptyEbookDraft())).toEqual(
      emptyEbookDraft(),
    );
  });

  it("takes only https links to Naffy and films from YouTube or Vimeo", () => {
    const draft = emptyEbookDraft();
    expect(
      ebookDraftSchema.safeParse({ ...draft, naffyUrl: "http://naffy.io/x" })
        .success,
    ).toBe(false);
    expect(
      ebookDraftSchema.safeParse({
        ...draft,
        videoUrl: "https://evil.example/v",
      }).success,
    ).toBe(false);
    expect(
      ebookDraftSchema.safeParse({
        ...draft,
        naffyUrl: "https://naffy.io/kolor-sensu/sen",
        videoUrl: "https://www.youtube.com/watch?v=abc_123",
      }).success,
    ).toBe(true);
  });

  it("takes a sample only as a PDF of the site's", () => {
    expect(
      ebookDraftSchema.safeParse({
        ...emptyEbookDraft(),
        samplePath: "ebooks/0b8c2f2e-5c4f-4c0a-9a1e-3f6c2d1b7a90.exe",
      }).success,
    ).toBe(false);
  });
});

describe("addresses, categories and refusals", () => {
  it("makes an address from a title, Polish letters folded", () => {
    expect(slugFromTitle("Jak radzić sobie z lękiem?")).toBe(
      "jak-radzic-sobie-z-lekiem",
    );
    expect(slugFromTitle("  ")).toBe("");
  });

  it("checks a category", () => {
    expect(
      articleCategoryInputSchema.safeParse({
        slug: "lek",
        name: "Lęk",
        description: "",
        sortOrder: 0,
      }).success,
    ).toBe(true);
    expect(
      articleCategoryInputSchema.safeParse({
        slug: "lek",
        name: " ",
        description: "",
        sortOrder: 0,
      }).success,
    ).toBe(false);
  });

  it("says in Polish what publishing lacks", () => {
    expect(publishProblem("article_incomplete:cover")).toBe(
      "Dodaj okładkę z opisem dla osób niewidomych.",
    );
    expect(publishProblem("something else")).toBeNull();
  });
});
