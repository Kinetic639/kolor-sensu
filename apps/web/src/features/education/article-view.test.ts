import { emptyArticleDocument } from "@repo/contracts/article-rich-text";
import {
  TEAM_AUTHOR_NAME,
  type PublishedArticle,
} from "@repo/contracts/education";
import { describe, expect, it } from "vitest";
import {
  articleAuthor,
  articleCard,
  articleDate,
  articleReviewer,
  articleSeo,
  relatedArticles,
  usedCategories,
  type ArticlePerson,
} from "./article-view";

const anna: ArticlePerson = {
  specialistId: "s1",
  publicSlug: "anna-nowak",
  displayName: "Anna Nowak",
  professionalTitle: "Psycholożka",
  portraitUrl: "https://example.invalid/anna.jpg",
};

function article(
  id: string,
  patch: Partial<PublishedArticle> = {},
): PublishedArticle {
  return {
    id,
    slug: id,
    title: `Artykuł ${id}`,
    lead: "Wstęp",
    coverPath: "",
    coverAlt: "",
    categoryId: "c1",
    body: emptyArticleDocument,
    authorKind: "team",
    authorSpecialistId: null,
    reviewerSpecialistId: null,
    sources: [],
    ebookId: null,
    seoTitle: "",
    seoDescription: "",
    ogImagePath: null,
    publishedAt: "2026-10-21T10:00:00Z",
    contentUpdatedAt: "2026-10-21T10:00:00Z",
    ...patch,
  };
}

const categories = [
  { id: "c1", slug: "dzieci", name: "Dzieci", description: "", sortOrder: 0 },
  { id: "c2", slug: "pary", name: "Pary", description: "", sortOrder: 1 },
  { id: "c3", slug: "pusta", name: "Pusta", description: "", sortOrder: 2 },
];

describe("an article's byline", () => {
  it("is the specialist's, linked to their profile", () => {
    expect(
      articleAuthor(
        article("a", { authorKind: "specialist", authorSpecialistId: "s1" }),
        [anna],
      ),
    ).toEqual({
      name: "Anna Nowak",
      href: "/specjalisci/anna-nowak",
      title: "Psycholożka",
      photoUrl: "https://example.invalid/anna.jpg",
    });
  });

  it("is the team's when the team signs it or the specialist is not on the site", () => {
    expect(articleAuthor(article("a"), [anna]).name).toBe(TEAM_AUTHOR_NAME);
    expect(
      articleAuthor(
        article("a", { authorKind: "specialist", authorSpecialistId: "s9" }),
        [anna],
      ),
    ).toMatchObject({ name: TEAM_AUTHOR_NAME, href: null });
  });

  it("names a reviewer only when there is one", () => {
    expect(articleReviewer(article("a"), [anna])).toBeNull();
    expect(
      articleReviewer(article("a", { reviewerSpecialistId: "s1" }), [anna])
        ?.name,
    ).toBe("Anna Nowak");
  });
});

describe("an article's card", () => {
  it("says the category, author, date and reading time", () => {
    expect(articleCard(article("lek"), categories, [anna])).toMatchObject({
      href: "/edukacja/artykuly/lek",
      category: { name: "Dzieci", href: "/edukacja/artykuly/kategoria/dzieci" },
      author: TEAM_AUTHOR_NAME,
      date: "21 października 2026",
      reading: "1 min czytania",
    });
  });

  it("dates in Warsaw's time", () => {
    expect(articleDate("2026-10-21T23:30:00Z")).toBe("22 października 2026");
  });
});

describe("what to read next", () => {
  const all = [
    article("a", { categoryId: "c1" }),
    article("b", { categoryId: "c2" }),
    article("c", { categoryId: "c1" }),
    article("d", { categoryId: "c2" }),
  ];

  it("is the same category first, never the article itself", () => {
    expect(relatedArticles(all[0]!, all).map((one) => one.id)).toEqual([
      "c",
      "b",
      "d",
    ]);
    expect(relatedArticles(all[0]!, all, 2).map((one) => one.id)).toEqual([
      "c",
      "b",
    ]);
  });

  it("lists only the categories that have articles", () => {
    expect(usedCategories(categories, all).map((one) => one.slug)).toEqual([
      "dzieci",
      "pary",
    ]);
  });
});

describe("an article in Google", () => {
  it("takes the SEO fields, else the title and lead", () => {
    expect(articleSeo(article("a"))).toEqual({
      title: "Artykuł a",
      description: "Wstęp",
    });
    expect(
      articleSeo(article("a", { seoTitle: "Lęk", seoDescription: "Opis" })),
    ).toEqual({ title: "Lęk", description: "Opis" });
  });
});
