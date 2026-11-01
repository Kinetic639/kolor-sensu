// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeatDetailsForm } from "./signup-forms";

vi.mock("./actions", () => ({
  applySeatCodeAction: vi.fn(),
  holdSeatAction: vi.fn(),
  joinWaitlistAction: vi.fn(),
  removeSeatCodeAction: vi.fn(),
  saveSeatDetailsAction: vi.fn(),
}));

afterEach(cleanup);

describe("the workshop sign-up's details (Warsztat · 3)", () => {
  it("offers the newsletter apart and unticked while it is on (card 8)", () => {
    render(
      <SeatDetailsForm
        free={false}
        newsletterController="Kolor Sensu sp. z o.o."
        payLater={null}
        saved={null}
        slug="warsztat"
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

  it("leaves it out while the newsletter is off", () => {
    render(
      <SeatDetailsForm
        free={false}
        payLater={null}
        saved={null}
        slug="warsztat"
      />,
    );
    expect(
      screen.queryByRole("group", { name: "Newsletter (dobrowolnie)" }),
    ).toBeNull();
  });

  it("warns against health details in the notes (card 6)", () => {
    render(
      <SeatDetailsForm
        free={false}
        payLater={null}
        saved={null}
        slug="warsztat"
      />,
    );
    expect(
      screen.getByText(/Nie podawaj tu informacji o zdrowiu/),
    ).toBeTruthy();
  });
});
