import { emptyRichTextDocument, type RichTextDocument } from "@repo/contracts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpecialistProfileView } from "./specialist-profile-view";

const base = {
  name: "Anna Kłobuchowska",
  role: "Psycholog",
  portraitSrc: "/images/specjalista.svg",
  splash: "pink-1" as const,
  longBio: null,
  shortBio: "Pomagam w kryzysach.",
  offers: [
    {
      key: "o1",
      name: "Terapia dla par",
      href: "/oferta/terapia-par",
      meta: "50 min · w gabinecie",
      price: "280 zł",
    },
    {
      key: "o2",
      name: "Konsultacja",
      meta: "50 min · online",
      price: "240 zł",
    },
  ],
  facts: [
    { title: "Specjalizacje", items: ["Lęk", "Depresja"] },
    { title: "Języki", items: [] },
  ],
  qualifications: ["Uniwersytet Warszawski"],
};

describe("SpecialistProfileView", () => {
  it("the portrait, the bio, the services with prices, the facts", () => {
    render(<SpecialistProfileView {...base} />);
    expect(
      screen.getByRole("img", { name: "Anna Kłobuchowska, Psycholog" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pomagam w kryzysach.")).toBeVisible();
    const offers = screen.getByRole("region", { name: "Usługi i ceny" });
    expect(
      within(offers).getByRole("link", { name: "Terapia dla par" }),
    ).toHaveAttribute("href", "/oferta/terapia-par");
    // Without a page: its name, not a link.
    expect(within(offers).getByText("Konsultacja").tagName).toBe("SPAN");
    expect(offers).toHaveTextContent("280 zł");
    expect(screen.getByText("Lęk")).toBeVisible();
    // A fact without items is left out.
    expect(screen.queryByText("Języki")).toBeNull();
    expect(screen.getByText("Uniwersytet Warszawski")).toBeVisible();
  });

  it("the full bio before the short one", () => {
    const longBio: RichTextDocument = {
      ...emptyRichTextDocument,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Pełny opis." }] },
      ],
    } as RichTextDocument;
    render(<SpecialistProfileView {...base} longBio={longBio} />);
    expect(screen.getByText("Pełny opis.")).toBeVisible();
    expect(screen.queryByText("Pomagam w kryzysach.")).toBeNull();
  });
});
