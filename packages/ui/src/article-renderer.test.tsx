import { articleHeadings } from "@repo/contracts/article-rich-text";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticleRenderer, ArticleTableOfContents } from "./article-renderer";
import { heading, paragraph, sampleArticle } from "./article.fixtures";

// An article's body as a reader gets it: every block in its place, images
// with their text, the box and the quote, a table that scrolls in its own
// box, the booking button, headings with the ids the table of contents
// links to; and nothing at all for content that is not an article.

const props = {
  imageUrl: (src: string) => `https://cdn.example/${src}`,
  bookingHref: (service: string | null) =>
    service ? `/umow-wizyte?usluga=${service}` : "/umow-wizyte",
};

describe("an article's body", () => {
  it("shows its headings, with the table of contents' ids", () => {
    render(<ArticleRenderer document={sampleArticle} {...props} />);
    const ids = articleHeadings(sampleArticle).map((one) => one.id);
    expect(
      screen.getAllByRole("heading").map((one) => one.getAttribute("id")),
    ).toEqual(ids);
    expect(
      screen.getByRole("heading", { level: 2, name: "Czym jest lęk" }),
    ).toHaveAttribute("id", "czym-jest-lek");
  });

  it("shows images with their text and caption", () => {
    render(<ArticleRenderer document={sampleArticle} {...props} />);
    expect(
      screen.getAllByRole("img", {
        name: "Jasny gabinet z fotelem przy oknie",
      }),
    ).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Fotel i roślina" })).toBeVisible();
    expect(screen.getByText("Gabinet Kolor Sensu").tagName).toBe("FIGCAPTION");
  });

  it("names the box, and quotes with who said it", () => {
    render(<ArticleRenderer document={sampleArticle} {...props} />);
    expect(
      within(screen.getByRole("complementary", { name: "Ważne" })).getByText(
        /zadzwoń pod numer 112/,
      ),
    ).toBeVisible();
    expect(screen.getByText("— Anna, klientka centrum")).toBeVisible();
  });

  it("keeps the table in a box the keyboard can scroll, headers as headers", () => {
    render(<ArticleRenderer document={sampleArticle} {...props} />);
    const box = screen.getByRole("region", { name: "Tabela" });
    expect(box).toHaveAttribute("tabindex", "0");
    expect(
      within(box).getByRole("columnheader", { name: "Jak często" }),
    ).toBeVisible();
    expect(within(box).getByRole("cell", { name: "Bezsenność" })).toBeVisible();
  });

  it("leads its button to booking, with the service chosen", () => {
    render(<ArticleRenderer document={sampleArticle} {...props} />);
    expect(
      screen.getByRole("link", { name: /Umów konsultację/ }),
    ).toHaveAttribute("href", "/umow-wizyte?usluga=konsultacja-psychologiczna");
  });

  it("shows nothing for content that is not an article", () => {
    const { container } = render(
      <ArticleRenderer
        document={{ type: "doc", content: [{ type: "iframe" }] } as never}
        {...props}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("the table of contents", () => {
  it("links to each heading, from three h2 headings", () => {
    render(
      <ArticleTableOfContents headings={articleHeadings(sampleArticle)} />,
    );
    const toc = screen.getByRole("navigation", { name: "Spis treści" });
    expect(
      within(toc).getByRole("link", { name: "Jak go rozpoznać" }),
    ).toHaveAttribute("href", "#jak-go-rozpoznac");
    expect(within(toc).getAllByRole("link")).toHaveLength(4);
  });

  it("is left out for a short article", () => {
    const { container } = render(
      <ArticleTableOfContents
        headings={articleHeadings({
          type: "doc",
          content: [heading("Jeden"), paragraph("x"), heading("Dwa")],
        })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
