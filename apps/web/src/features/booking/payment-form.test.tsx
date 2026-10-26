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

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => Promise.resolve(null),
}));
vi.mock("@stripe/react-stripe-js/checkout", () => ({
  CheckoutElementsProvider: ({ children }: { children: ReactNode }) => children,
  PaymentElement: () => null,
  useCheckoutElements: () => ({ type: "success", checkout: { confirm } }),
}));

const { PaymentForm } = await import("./payment-form");

afterEach(cleanup);

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
});
