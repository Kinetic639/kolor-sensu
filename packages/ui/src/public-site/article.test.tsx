import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArticleCard } from "./article-cards";
import { ArticleHeader, ArticleSources, ArticleTrust } from "./article-page";
import { sampleArticles, sampleAuthor } from "./article-samples";
import { ArticleShare } from "./article-share";

const [first] = sampleArticles;

describe("an article's card", () => {
  it("links by its title, and to its category", () => {
    render(<ArticleCard article={first!} />);
    expect(
      screen.getByRole("heading", { level: 3, name: first!.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: first!.title })).toHaveAttribute(
      "href",
      first!.href,
    );
    expect(
      screen.getByRole("link", { name: "Dzieci i młodzież" }),
    ).toHaveAttribute("href", "/edukacja/artykuly/kategoria/dzieci");
    expect(screen.getByText("6 min")).toBeInTheDocument();
    expect(screen.queryByText(/6 min czytania/)).toBeNull();
    expect(screen.getByRole("link", { name: "Przeczytaj" })).toHaveAttribute(
      "href",
      first!.href,
    );
    expect(screen.getByText(new RegExp(first!.author))).toBeInTheDocument();
    expect(screen.getByText(first!.date)).toHaveAttribute(
      "dateTime",
      first!.dateTime,
    );
    expect(
      document.querySelector(".ks-education-article-frame svg"),
    ).not.toBeNull();
    expect(
      document.querySelector(".ks-education-article-foot .ks-wk__hover-paint"),
    ).not.toBeNull();
  });
  it("places the author and optional portrait in the footer, and dates above the title", () => {
    const { container, rerender } = render(
      <ArticleCard
        article={{
          ...first!,
          authorAvatarUrl: "/anna.webp",
          authorTitle: "Psycholożka",
        }}
      />,
    );
    const footer = container.querySelector(".ks-education-article-foot")!;
    expect(footer.textContent).toContain(first!.author);
    expect(
      footer.querySelector(".ks-education-article-author-name"),
    ).toHaveTextContent(first!.author);
    expect(
      footer.querySelector(".ks-education-article-author-title"),
    ).toHaveTextContent("Psycholożka");
    expect(footer.querySelector("img")?.getAttribute("src")).toContain(
      "anna.webp",
    );
    expect(
      container.querySelector(".ks-education-article-topline time"),
    ).toHaveTextContent(first!.date);
    expect(
      container.querySelector(".ks-education-article-topline"),
    ).toHaveTextContent("6 min");
    expect(footer).not.toHaveTextContent("6 min");
    const category = container.querySelector(".ks-education-kicker")!;
    expect(
      container
        .querySelector(".ks-education-article-topline")!
        .compareDocumentPosition(category) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    rerender(<ArticleCard article={{ ...first!, authorAvatarUrl: null }} />);
    expect(footer.querySelector("img")).toBeNull();
    expect(footer.textContent).toContain(first!.author);
  });
});

describe("an article's page", () => {
  it("has the one H1 and the author's profile", () => {
    render(
      <ArticleHeader
        author={sampleAuthor}
        category={null}
        date="21 października 2026"
        dateTime="2026-10-21"
        lead="Wstęp"
        reading="6 min czytania"
        title="Lęk u dzieci"
      />,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Anna Nowak" })).toHaveAttribute(
      "href",
      "/specjalisci/anna-nowak",
    );
  });

  it("opens sources in a new tab, and says so", () => {
    render(
      <ArticleSources
        sources={[{ title: "WHO", url: "https://www.who.int/" }]}
      />,
    );
    const link = screen.getByRole("link", { name: /WHO.*nowej karcie/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("names the reviewer only when there is one", () => {
    const { rerender } = render(
      <ArticleTrust crisisHref="/k" reviewer={null} therapyNote="Uwaga" />,
    );
    expect(screen.queryByText(/Sprawdzone przez/)).toBeNull();
    rerender(
      <ArticleTrust
        crisisHref="/k"
        reviewer={sampleAuthor}
        therapyNote="Uwaga"
      />,
    );
    expect(screen.getByText(/Sprawdzone przez/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Pomoc w kryzysie/ }),
    ).toBeInTheDocument();
  });
});

describe("sharing an article", () => {
  it("copies the link and links to Facebook on a computer", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ArticleShare title="Lęk" url="https://example.invalid/a" />);
    fireEvent.click(screen.getByRole("button", { name: "Kopiuj link" }));
    expect(writeText).toHaveBeenCalledWith("https://example.invalid/a");
    expect(
      await screen.findByRole("button", { name: "Skopiowano" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Udostępnij na Facebooku/ }),
    ).toHaveAttribute(
      "href",
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.invalid%2Fa",
    );
  });
});
