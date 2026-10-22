import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  NewsletterArchiveList,
  NewsletterIssueCards,
} from "./newsletter-issue";

describe("NewsletterIssueCards", () => {
  it("links each card by its title, and keeps a card without a link plain", () => {
    render(
      <NewsletterIssueCards
        cards={[
          {
            eyebrow: "Artykuł",
            title: "Jak rozmawiać o emocjach",
            text: "Kilka prostych zdań.",
            href: "/edukacja/artykuly/jak-rozmawiac",
            label: "Przeczytaj",
            imageUrl: null,
          },
          {
            eyebrow: "Z centrum",
            title: "Nowe godziny w soboty",
            text: "Od listopada do 16:00.",
            href: null,
            label: "",
            imageUrl: null,
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Jak rozmawiać o emocjach" }),
    ).toHaveAttribute("href", "/edukacja/artykuly/jak-rozmawiac");
    expect(screen.getByText("Nowe godziny w soboty")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shows nothing without cards", () => {
    const { container } = render(<NewsletterIssueCards cards={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("NewsletterArchiveList", () => {
  it("lists the issues with their number and date", () => {
    render(
      <NewsletterArchiveList
        empty="Jeszcze nic"
        issues={[
          {
            number: 2,
            href: "/newsletter/2",
            subject: "Listopad w Kolor Sensu",
            previewText: "Warsztaty i nowe artykuły",
            date: "3 listopada 2026",
            dateTime: "2026-11-03T08:00:00Z",
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Listopad w Kolor Sensu" }),
    ).toHaveAttribute("href", "/newsletter/2");
    expect(screen.getByText(/Nr 2/)).toBeInTheDocument();
  });

  it("says so while nothing has gone out", () => {
    render(<NewsletterArchiveList empty="Jeszcze nic" issues={[]} />);
    expect(screen.getByText("Jeszcze nic")).toBeInTheDocument();
  });
});
