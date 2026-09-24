import { render, screen } from "@testing-library/react";
import { Leaf } from "lucide-react";
import { describe, expect, it } from "vitest";
import { ArrowLink, PrimaryButton, SecondaryButton } from "./actions";
import { BotanicalAccent } from "./botanical-accent";
import {
  PastelIconTile,
  SoftCard,
  WatercolorSectionBackground,
} from "./surfaces";
import { EditorialHeading, SectionEyebrow } from "./typography";

describe("public site primitives", () => {
  it("keeps typography roles next to colour utilities", () => {
    render(
      <>
        <SectionEyebrow>Nasza oferta</SectionEyebrow>
        <EditorialHeading as="h1" accent="Więcej sensu.">
          Więcej zrozumienia.
        </EditorialHeading>
      </>,
    );

    // Regression: tailwind-merge used to drop text-eyebrow / text-ink as
    // conflicting "text colours".
    expect(screen.getByText("Nasza oferta")).toHaveClass(
      "text-eyebrow",
      "text-text-muted",
    );
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("font-display", "text-display", "text-ink");
    expect(heading).toHaveTextContent("Więcej zrozumienia.Więcej sensu.");
    expect(screen.getByText("Więcej sensu.")).toHaveClass("text-pink");
  });

  it("picks the heading size from the level unless told otherwise", () => {
    render(
      <EditorialHeading as="h3" size="h2">
        Przestrzeń, która wspiera
      </EditorialHeading>,
    );

    expect(screen.getByRole("heading", { level: 3 })).toHaveClass("text-h2");
  });

  it("renders buttons with a decorative arrow and as links", () => {
    render(
      <>
        <PrimaryButton arrow>Umów wizytę</PrimaryButton>
        <SecondaryButton asChild>
          <a href="/kontakt">Kontakt</a>
        </SecondaryButton>
        <ArrowLink href="/oferta">Zobacz ofertę</ArrowLink>
      </>,
    );

    const primary = screen.getByRole("button", { name: "Umów wizytę" });
    expect(primary).toHaveClass("bg-primary", "rounded-button");
    expect(primary.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("link", { name: "Kontakt" })).toHaveClass(
      "border-border-strong",
    );
    expect(screen.getByRole("link", { name: "Zobacz ofertę" })).toHaveAttribute(
      "href",
      "/oferta",
    );
  });

  it("makes the whole tile one link named by its title", () => {
    const { container } = render(
      <PastelIconTile
        tone="blush"
        icon={<Leaf />}
        title="Konsultacje psychologiczne"
        description="Pierwszy krok do zmiany."
        href="/oferta/konsultacje"
      />,
    );

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Konsultacje psychologiczne" }),
    ).toHaveAttribute("href", "/oferta/konsultacje");
    expect(container.querySelector(".ks-paint")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(container.querySelector("article")).toHaveAttribute(
      "data-tone",
      "blush",
    );
  });

  it("paints a section band behind real content", () => {
    const { container } = render(
      <WatercolorSectionBackground accent aria-label="Pierwszy krok">
        <p>Zrób pierwszy krok</p>
      </WatercolorSectionBackground>,
    );

    expect(screen.getByRole("region", { name: "Pierwszy krok" })).toBeVisible();
    expect(container.querySelector(".ks-paint--band")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("renders a soft card surface", () => {
    render(<SoftCard interactive>Treść</SoftCard>);

    expect(screen.getByText("Treść")).toHaveClass(
      "rounded-card",
      "shadow-card",
      "bg-surface",
    );
  });

  it("draws botanical line art that can be animated", () => {
    const { container } = render(<BotanicalAccent variant="leaf" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("aria-hidden", "true");
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThan(3);
    paths.forEach((path) => expect(path).toHaveAttribute("pathLength", "1"));
  });
});
