// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bookingRules } from "./booking-rules";

// The Regulamin's "Zasady rezerwacji" (Klient · 3, card 14): written from
// the centre's settings, so they say what the system does.

vi.mock("@/lib/public-data", () => ({ getBookingWindow: vi.fn() }));
const { BookingRulesList } = await import("./booking-rules-section");

afterEach(cleanup);

const settings = {
  holdMinutes: 10,
  paymentDueHours: 48,
  cancellationWindowHours: 24,
  rescheduleWindowHours: 24,
  maxSelfReschedules: 1,
};

describe("bookingRules", () => {
  it("takes every number from the centre's settings", () => {
    const text = (title: string) =>
      bookingRules({
        holdMinutes: 15,
        paymentDueHours: 72,
        cancellationWindowHours: 36,
        rescheduleWindowHours: 12,
        maxSelfReschedules: 2,
      }).find((rule) => rule.title === title)!.text;
    expect(text("Wybrany termin")).toContain("czeka na Ciebie 15 min");
    expect(text("Płatność później")).toContain(
      "płacisz najpóźniej 72 godz. przed wizytą",
    );
    expect(text("Odwołanie wizyty")).toContain(
      "najpóźniej 36 godz. przed jej początkiem",
    );
    expect(text("Zmiana terminu")).toContain(
      "najpóźniej 12 godz. przed jej początkiem, najwyżej 2 razy",
    );
    expect(text("Zmiana terminu").endsWith("najwyżej 2 razy.")).toBe(true);
  });

  it("says once, not twice, for one change allowed", () => {
    const rule = bookingRules(settings).find(
      (one) => one.title === "Zmiana terminu",
    )!;
    expect(rule.text).toContain("najwyżej 1 raz.");
  });

  it("names the rules the wizard applies: one visit at a time, the 14 days, minors", () => {
    const all = bookingRules(settings)
      .map((rule) => rule.text)
      .join(" ");
    expect(all).toContain(
      "Jedna osoba (ten sam e-mail albo telefon) może mieć tylko jedną wizytę o tej samej porze.",
    );
    expect(all).toContain("w ciągu 14 dni od rezerwacji");
    expect(all).toContain("rezerwuje rodzic albo opiekun prawny");
  });
});

describe("BookingRulesList", () => {
  it("a section under its own heading, each rule a term and its text", () => {
    render(<BookingRulesList rules={bookingRules(settings)} />);
    const section = screen.getByRole("region", { name: "Zasady rezerwacji" });
    expect(
      within(section).getByRole("heading", { level: 2 }),
    ).toHaveTextContent("Zasady rezerwacji");
    expect(within(section).getByText("Odwołanie wizyty")).toBeVisible();
    expect(
      within(section).getByText(/odwołując ją najpóźniej 24 godz\./),
    ).toBeVisible();
  });
});
