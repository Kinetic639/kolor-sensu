import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EbookCard, EbookDetails, EbookHero, EbookPrice } from "./ebook-parts";
import { sampleEbooks } from "./ebook-samples";

const [first] = sampleEbooks;

describe("an e-book's card", () => {
  it("links by its title", () => {
    render(<EbookCard ebook={first!} eyebrow="E-book" headingLevel="h2" />);
    expect(screen.getByRole("link", { name: "Spokojny sen" })).toHaveAttribute(
      "href",
      "/edukacja/ebooki/spokojny-sen",
    );
    expect(screen.getByText("E-book")).toBeInTheDocument();
  });
});

describe("an e-book's page", () => {
  it("has the one H1, sends to Naffy in a new tab and offers the sample", () => {
    render(
      <EbookHero
        coverAlt="Okładka"
        coverUrl={null}
        description="O śnie"
        format="PDF"
        naffyUrl="https://example.invalid/naffy"
        sampleHref="https://example.invalid/f.pdf"
        title="Spokojny sen"
      />,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const buy = screen.getByRole("link", {
      name: /Zobacz cenę i kup na Naffy/,
    });
    expect(buy).toHaveAttribute("href", "https://example.invalid/naffy");
    expect(buy).toHaveAttribute("target", "_blank");
    expect(
      screen.getByRole("link", { name: /Pobierz darmowy fragment/ }),
    ).toHaveAttribute("href", "https://example.invalid/f.pdf");
  });

  it("leaves out the ways it does not have", () => {
    render(
      <EbookHero
        coverAlt=""
        coverUrl={null}
        description="O śnie"
        format=""
        naffyUrl={null}
        sampleHref={null}
        title="Spokojny sen"
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("lists what is inside, only when there is something", () => {
    const { rerender } = render(
      <EbookDetails
        audience=""
        contents={[]}
        description={{ type: "doc", content: [{ type: "paragraph" }] }}
      />,
    );
    expect(
      screen.queryByRole("heading", { name: "Co jest w środku" }),
    ).toBeNull();
    rerender(
      <EbookDetails
        audience="Dorośli"
        contents={["Rozdział 1", "Rozdział 2"]}
        description={{ type: "doc", content: [{ type: "paragraph" }] }}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "Dla kogo" }),
    ).toBeInTheDocument();
  });
});

describe("an e-book's price from Naffy", () => {
  it("shows a promotion as Naffy does: the old price crossed out, the new one, the 30-day lowest", () => {
    render(
      <EbookPrice
        price={{
          current: "20,67 zł",
          regular: "37,00 zł",
          lowest: "Najniższa cena z ostatnich 30 dni przed obniżką: 37,00 zł",
        }}
      />,
    );
    expect(screen.getByText(/37,00 zł/, { selector: "del" })).toHaveTextContent(
      "Cena przed obniżką: 37,00 zł",
    );
    expect(screen.getByText(/Cena teraz/).parentElement).toHaveTextContent(
      "Cena teraz: 20,67 zł",
    );
    expect(
      screen.getByText(/Najniższa cena z ostatnich 30 dni/),
    ).toBeInTheDocument();
  });

  it("says Kup na Naffy once the price is shown", () => {
    render(
      <EbookHero
        coverAlt=""
        coverUrl={null}
        description="O śnie"
        format=""
        naffyUrl="https://example.invalid/naffy"
        price={{ current: "37,00 zł", regular: null, lowest: null }}
        sampleHref={null}
        title="Spokojny sen"
      />,
    );
    expect(
      screen.getByRole("link", { name: /^Kup na Naffy/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Najniższa cena/)).toBeNull();
  });
});
