// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DetailsForm } from "./details-form";

vi.mock("./actions", () => ({ saveDetailsAction: vi.fn() }));

afterEach(cleanup);

describe("the booking's details form", () => {
  it("offers the newsletter, unticked, while it is on", () => {
    render(
      <DetailsForm
        newsletterController="Kolor Sensu sp. z o.o."
        payLater={null}
        saved={null}
      />,
    );
    const group = screen.getByRole("group", {
      name: "Newsletter (dobrowolnie)",
    });
    const box = group.querySelector<HTMLInputElement>(
      'input[name="newsletter"]',
    );
    expect(box).not.toBeNull();
    expect(box!.checked).toBe(false);
  });

  it("shows no error before the client sends anything (#24)", () => {
    render(<DetailsForm payLater={null} saved={null} />);
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("leaves it out while the newsletter is off", () => {
    render(<DetailsForm payLater={null} saved={null} />);
    expect(
      screen.queryByRole("group", { name: "Newsletter (dobrowolnie)" }),
    ).toBeNull();
  });

  it("a new time keeps the details given before, the consents to tick again", () => {
    render(
      <DetailsForm
        payLater={null}
        prefill={{
          firstName: "Ola",
          lastName: "Klientka",
          email: "ola@example.invalid",
          phone: "600 100 200",
          notes: "Pierwsza wizyta",
        }}
        saved={null}
      />,
    );
    // Apart: the first name and the last name (25.10).
    expect(screen.getByLabelText(/^Imię/)).toHaveProperty("value", "Ola");
    expect(screen.getByLabelText(/^Nazwisko/)).toHaveProperty(
      "value",
      "Klientka",
    );
    expect(screen.getByDisplayValue("ola@example.invalid")).toBeTruthy();
    expect(screen.getByDisplayValue("600 100 200")).toBeTruthy();
    for (const name of ["acceptTerms", "acceptPrivacy"]) {
      const box = document.querySelector<HTMLInputElement>(
        `input[name="${name}"]`,
      );
      expect(box?.checked).toBe(false);
    }
    // Not "saved": these are for the new visit, still to be sent.
    expect(screen.queryByText(/Twoje dane są zapisane/)).toBeNull();
  });

  it("warns against health details in the notes (Klient · 3, card 10)", () => {
    render(<DetailsForm payLater={null} saved={null} />);
    const notes = screen.getByLabelText(/^Uwagi/);
    expect(notes.getAttribute("aria-describedby")).toBeTruthy();
    expect(
      screen.getByText(
        "Nie podawaj tu informacji o zdrowiu; porozmawiacie o nich na spotkaniu.",
      ),
    ).toBeTruthy();
  });

  it("asks for the request to start early and the guardian only when the visit needs them (cards 15, 16)", () => {
    render(<DetailsForm payLater={null} saved={null} />);
    for (const name of ["acceptEarlyStart", "confirmGuardian"]) {
      expect(document.querySelector(`input[name="${name}"]`)).toBeNull();
    }
    cleanup();

    render(
      <DetailsForm
        needs={{ earlyStart: true, guardian: true }}
        payLater={null}
        saved={null}
      />,
    );
    const early = screen.getByRole("checkbox", {
      name: /Wizyta wypada w ciągu 14 dni od rezerwacji/,
    });
    expect(early).toHaveProperty("name", "acceptEarlyStart");
    expect(early).toHaveProperty("checked", false);
    const guardian = screen.getByRole("checkbox", {
      name: /Rezerwuję jako rodzic lub opiekun prawny/,
    });
    expect(guardian).toHaveProperty("name", "confirmGuardian");
    expect(guardian).toHaveProperty("checked", false);
  });

  it("sends the reference of the visit it shows (card 7)", () => {
    render(<DetailsForm payLater={null} reference="2610-001" saved={null} />);
    expect(
      document.querySelector<HTMLInputElement>('input[name="rezerwacja"]')
        ?.value,
    ).toBe("2610-001");
  });
});
