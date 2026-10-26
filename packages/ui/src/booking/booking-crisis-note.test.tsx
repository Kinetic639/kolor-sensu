// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BookingCrisisNote } from "./booking-crisis-note";

// Help in a crisis on the booking wizard's steps (#247): 112 first, then
// 116 123 (or the CMS's first other line), each dialling, and the page.

afterEach(cleanup);

const lines = [
  {
    number: "112",
    label: "Numer alarmowy",
    detail: "gdy życie jest w zagrożeniu",
  },
  { number: "800 702 222", label: "Centrum Wsparcia", detail: "całodobowo" },
  {
    number: "116 123",
    label: "Kryzysowy Telefon Zaufania",
    detail: "dla dorosłych",
  },
];

describe("BookingCrisisNote", () => {
  it("names 112 and 116 123, each dialling, and leads to the help page", () => {
    render(<BookingCrisisNote href="/pomoc-w-kryzysie" lines={lines} />);
    const note = screen.getByRole("complementary", {
      name: "Pomoc w kryzysie",
    });
    expect(within(note).getByRole("link", { name: "112" })).toHaveAttribute(
      "href",
      "tel:112",
    );
    expect(within(note).getByRole("link", { name: "116 123" })).toHaveAttribute(
      "href",
      "tel:116123",
    );
    expect(note).toHaveTextContent(
      "Kryzysowy Telefon Zaufania (dla dorosłych)",
    );
    expect(
      within(note).getByRole("link", { name: "Pomoc w kryzysie" }),
    ).toHaveAttribute("href", "/pomoc-w-kryzysie");
  });

  it("takes the CMS's first other line when 116 123 is not among them", () => {
    render(
      <BookingCrisisNote
        href="/pomoc-w-kryzysie"
        lines={[lines[0]!, lines[1]!]}
      />,
    );
    expect(screen.getByRole("link", { name: "800 702 222" })).toHaveAttribute(
      "href",
      "tel:800702222",
    );
  });
});
