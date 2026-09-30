import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PageTitle,
  PortalRoutePlaceholder,
  StatTile,
} from "./portal-content";

describe("StatTile", () => {
  it("shows a figure with its label and detail", () => {
    render(
      <StatTile
        detail="Rozłożone na 4 bloki"
        label="Łączny wymiar dyżurów"
        tone="mint"
        value="12 godz. / tydz."
      />,
    );
    const tile = screen.getByRole("group", { name: "Łączny wymiar dyżurów" });
    expect(tile).toHaveTextContent("12 godz. / tydz.");
    expect(tile).toHaveTextContent("Rozłożone na 4 bloki");
  });
});

describe("PageTitle", () => {
  it("names the page for assistive tech without a visible header", () => {
    render(<PageTitle>Ustawienia centrum</PageTitle>);
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Ustawienia centrum",
    });
    expect(heading).toHaveClass("sr-only");
  });
});

describe("PortalRoutePlaceholder", () => {
  it("has no visible page header", () => {
    render(
      <PortalRoutePlaceholder title="Kalendarz" />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Kalendarz" }),
    ).toHaveClass("sr-only");
  });
});
