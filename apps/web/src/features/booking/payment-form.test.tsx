// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Pressing "Zapłać" twice confirms the payment once (Klient · 4): Stripe's
// session has one payment, and the form asks for it once at a time.

const confirm = vi.hoisted(() => vi.fn());
const loaded = vi.hoisted(() => ({ type: "success" as "success" | "error" }));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => Promise.resolve(null),
}));
vi.mock("@stripe/react-stripe-js/checkout", () => ({
  CheckoutElementsProvider: ({ children }: { children: ReactNode }) => children,
  PaymentElement: () => null,
  useCheckoutElements: () =>
    loaded.type === "success"
      ? { type: "success", checkout: { confirm } }
      : { type: "error", error: { message: "no Stripe" } },
}));

const { PaymentForm } = await import("./payment-form");

afterEach(() => {
  cleanup();
  loaded.type = "success";
});

describe("PaymentForm", () => {
  it("confirms once however often the button is pressed", async () => {
    let done: (value: { type: "success" }) => void = () => {};
    confirm.mockReturnValue(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    render(<PaymentForm clientSecret="cs_secret" payLabel="Zapłać 150 zł" />);
    const form = screen
      .getByRole("button", { name: "Zapłać 150 zł" })
      .closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Przetwarzanie…" }),
    ).toBeDisabled();

    await act(async () => done({ type: "success" }));
    expect(screen.getByRole("button", { name: "Zapłać 150 zł" })).toBeEnabled();
  });

  it("when Stripe's form cannot load, says so with the centre's phone (Klient · 4, card 15)", () => {
    loaded.type = "error";
    render(
      <PaymentForm
        clientSecret="cs_secret"
        payLabel="Zapłać 150 zł"
        phone={{ phone: "+48123456789", label: "123 456 789" }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie udało się wczytać płatności. Odśwież stronę albo zadzwoń do nas: 123 456 789.",
    );
    expect(screen.getByRole("link", { name: "123 456 789" })).toHaveAttribute(
      "href",
      "tel:+48123456789",
    );
    expect(screen.queryByRole("button", { name: /Zapłać/ })).toBeNull();
  });

  it("without a phone on file, the message still stands", () => {
    loaded.type = "error";
    render(<PaymentForm clientSecret="cs_secret" payLabel="Zapłać 150 zł" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie udało się wczytać płatności. Odśwież stronę albo zadzwoń do nas.",
    );
  });
});
