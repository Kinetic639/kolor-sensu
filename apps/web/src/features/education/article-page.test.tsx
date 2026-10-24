// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { emptyArticleDocument } from "@repo/contracts/article-rich-text";
import type {
  PublishedArticle,
  PublishedEbook,
} from "@repo/contracts/education";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicService } from "@/lib/public-data";
import type { ArticlePerson } from "./article-view";

// Under an article: the e-book it recommends, the services it links (each
// to its page and to booking) and the specialists (each to their profile);
// what the article does not link is not there.

vi.mock("@/lib/education-data", () => ({
  articleImageUrl: (path: string) => `https://cdn.example.invalid/${path}`,
}));

const { ArticlePageView } = await import("./article-page");

afterEach(cleanup);

const article: PublishedArticle = {
  id: "a1",
  slug: "lek-u-dzieci",
  title: "Lęk u dzieci",
  lead: "Wstęp",
  coverPath: "",
  coverAlt: "",
  categoryId: "c1",
  body: emptyArticleDocument,
  authorKind: "team",
  authorSpecialistId: null,
  reviewerSpecialistId: null,
  sources: [],
  ebookId: "e1",
  seoTitle: "",
  seoDescription: "",
  ogImagePath: null,
  publishedAt: "2026-10-21T10:00:00Z",
  contentUpdatedAt: "2026-10-21T10:00:00Z",
};

const ebook: PublishedEbook = {
  id: "e1",
  slug: "spokojny-sen",
  title: "Spokojny sen",
  coverPath: "",
  coverAlt: "",
  shortDescription: "Krótko o śnie.",
  description: { type: "doc", content: [{ type: "paragraph" }] },
  audience: "",
  contents: [],
  format: "PDF",
  naffyUrl: "https://example.invalid/ebook",
  showPrice: false,
  videoUrl: "",
  samplePath: null,
  seoTitle: "",
  seoDescription: "",
  ogImagePath: null,
  publishedAt: "2026-10-21T10:00:00Z",
  contentUpdatedAt: "2026-10-21T10:00:00Z",
};

const service = (id: string, slug: string, name: string) =>
  ({ id, slug, name }) as PublicService;

const anna: ArticlePerson = {
  specialistId: "s1",
  publicSlug: "anna-nowak",
  displayName: "Anna Nowak",
  professionalTitle: "Psycholożka dziecięca",
  portraitUrl: null,
};
const ewa: ArticlePerson = {
  ...anna,
  specialistId: "s2",
  publicSlug: "ewa-lis",
  displayName: "Ewa Lis",
};

function open(
  links = { serviceIds: ["v1"], specialistIds: ["s1"] },
  bookable: ReadonlySet<string> = new Set(["terapia-dzieci"]),
) {
  render(
    <ArticlePageView
      all={[article]}
      bookable={bookable}
      article={article}
      categories={[]}
      ebook={ebook}
      links={links}
      people={[anna, ewa]}
      services={[
        service("v1", "terapia-dzieci", "Terapia dzieci"),
        service("v2", "terapia-par", "Terapia par"),
      ]}
      therapyNote="Artykuł nie zastępuje terapii."
    />,
  );
}

describe("under an article", () => {
  it("is the e-book it recommends, to its page", () => {
    open();
    expect(screen.getByRole("link", { name: /Spokojny sen/ })).toHaveAttribute(
      "href",
      "/edukacja/ebooki/spokojny-sen",
    );
  });

  it("are the services it links, each to its page and to booking", () => {
    open();
    const section = screen.getByRole("region", { name: "Jak możemy pomóc" });
    expect(
      within(section).getByRole("link", { name: "Terapia dzieci" }),
    ).toHaveAttribute("href", "/oferta/terapia-dzieci");
    expect(
      within(section).getByRole("link", { name: /Umów wizytę/ }),
    ).toHaveAttribute("href", "/umow-wizyte?usluga=terapia-dzieci");
    expect(within(section).queryByText("Terapia par")).not.toBeInTheDocument();
  });

  it("asks through Kontakt for a service not booked online (#199)", () => {
    open(undefined, new Set());
    const section = screen.getByRole("region", { name: "Jak możemy pomóc" });
    expect(
      within(section).getByRole("link", { name: /Zapytaj o termin/ }),
    ).toHaveAttribute("href", "/kontakt");
  });

  it("are the specialists it links, each to their profile", () => {
    open();
    const section = screen.getByRole("region", {
      name: "Specjaliści, którzy pomagają",
    });
    expect(
      within(section).getByRole("link", { name: "Anna Nowak" }),
    ).toHaveAttribute("href", "/specjalisci/anna-nowak");
    expect(within(section).getByText("Psycholożka dziecięca")).toBeVisible();
    expect(within(section).queryByText("Ewa Lis")).not.toBeInTheDocument();
  });

  it("has no services or specialists when it links none", () => {
    open({ serviceIds: [], specialistIds: [] });
    expect(
      screen.queryByRole("region", { name: "Jak możemy pomóc" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Specjaliści, którzy pomagają" }),
    ).not.toBeInTheDocument();
  });
});
