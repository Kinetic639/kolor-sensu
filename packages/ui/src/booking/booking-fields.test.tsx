import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookingField, ConsentCheckbox } from "./booking-fields";

describe("BookingField", () => {
  it("labels the input and ties its error and hint to it", () => {
    render(
      <BookingField
        autoComplete="email"
        defaultValue="jan@"
        error="Podaj poprawny adres e-mail."
        hint="Wyślemy na niego potwierdzenie."
        label="E-mail"
        name="email"
        required
        type="email"
      />,
    );
    const input = screen.getByRole("textbox", { name: "E-mail" });
    expect(input).toHaveValue("jan@");
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Podaj poprawny adres e-mail. Wyślemy na niego potwierdzenie.",
    );
  });

  it("can be a longer text", () => {
    render(<BookingField label="Uwagi" multiline name="notes" />);
    expect(screen.getByRole("textbox", { name: "Uwagi" }).tagName).toBe(
      "TEXTAREA",
    );
  });
});

describe("ConsentCheckbox", () => {
  it("is a required checkbox, its link readable, its error announced", () => {
    render(
      <ConsentCheckbox
        error="Zaakceptuj regulamin."
        linkHref="/regulamin"
        linkLabel="regulamin"
        name="acceptTerms"
        text="Akceptuję"
      />,
    );
    const box = screen.getByRole("checkbox", { name: "Akceptuję regulamin" });
    expect(box).toBeRequired();
    expect(box).toHaveAccessibleDescription("Zaakceptuj regulamin.");
    expect(screen.getByRole("link", { name: "regulamin" })).toHaveAttribute(
      "href",
      "/regulamin",
    );
  });
});
