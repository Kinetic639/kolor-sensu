// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound, { metadata } from "./not-found";

// A wrong or old link: the centre's own page with a way on, not a bare 404.

describe("a page that is not there", () => {
  it("says so in the site's words and leads home or to Kontakt", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Nie znaleźliśmy jej",
    );
    expect(screen.getByRole("link", { name: /Strona główna/ })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Kontakt" })).toHaveAttribute(
      "href",
      "/kontakt",
    );
    expect(metadata.title).toBe("Nie znaleziono strony");
  });
});
