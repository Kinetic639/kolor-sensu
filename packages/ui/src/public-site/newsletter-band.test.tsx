import { plainHeader } from "@repo/contracts/section-header";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NewsletterBand } from "./newsletter-band";

describe("NewsletterBand", () => {
  it("shows the CMS's words in a section named by its title", () => {
    render(
      <NewsletterBand
        header={plainHeader({
          eyebrow: "Newsletter",
          title: "Bądźmy w kontakcie",
          description: "Artykuły i nowości raz w miesiącu.",
        })}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Bądźmy w kontakcie" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Artykuły i nowości raz w miesiącu."),
    ).toBeInTheDocument();
  });

  it("links where the CMS's call to action says", () => {
    render(
      <NewsletterBand
        header={plainHeader({
          eyebrow: "Newsletter",
          title: "Bądźmy w kontakcie",
          cta: { label: "Napisz do nas", href: "/kontakt", style: "arrow" },
        })}
      />,
    );
    expect(screen.getByRole("link", { name: /Napisz do nas/ })).toHaveAttribute(
      "href",
      "/kontakt",
    );
  });
});
