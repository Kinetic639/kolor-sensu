// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ServiceNotFound from "./not-found";

describe("a service that is not there", () => {
  it("says so and leads back to the offer", () => {
    render(<ServiceNotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Nie znaleźliśmy jej",
    );
    expect(screen.getByRole("link", { name: /Zobacz ofertę/ })).toHaveAttribute(
      "href",
      "/oferta",
    );
  });
});
