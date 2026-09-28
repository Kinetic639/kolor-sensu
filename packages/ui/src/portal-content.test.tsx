import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTile } from "./portal-content";

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
