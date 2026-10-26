// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The booking wizard's steps end with help in a crisis, its numbers the
// CMS's (#247).

vi.mock("@/lib/public-data", () => ({
  getCrisisHelp: async () => ({
    lines: [
      { number: "112", label: "Numer alarmowy", detail: "" },
      {
        number: "116 123",
        label: "Kryzysowy Telefon Zaufania",
        detail: "dla dorosłych",
      },
    ],
  }),
}));

const { default: BookingLayout } = await import("./layout");

describe("the booking wizard's layout", () => {
  it("puts help in a crisis, with the CMS's numbers, under every step", async () => {
    render(await BookingLayout({ children: <p>Krok kreatora</p> }));
    expect(screen.getByText("Krok kreatora")).toBeVisible();
    const note = screen.getByRole("complementary", {
      name: "Pomoc w kryzysie",
    });
    expect(within(note).getByRole("link", { name: "116 123" })).toHaveAttribute(
      "href",
      "tel:116123",
    );
  });
});
