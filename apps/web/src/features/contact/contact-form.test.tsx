// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContactResult } from "./contact-shared";

// The contact form in the browser: its fields and what it says about the
// data, errors at their fields, the thank-you, and another way to reach the
// centre when sending fails. Turnstile and the Server Action stand in.

let next: ContactResult = { status: "sent" };
vi.mock("./actions", () => ({
  sendContactMessageAction: vi.fn(async () => next),
}));

let verify: (() => void) | undefined;
vi.mock("@/features/booking/turnstile-widget", () => ({
  TurnstileWidget: ({ onVerify }: { onVerify?: () => void }) => {
    verify = onVerify;
    return null;
  },
}));

const { ContactForm } = await import("./contact-form");

const props = {
  heading: "Napisz do nas",
  turnstileSiteKey: "test",
  controller: "Kolor Sensu sp. z o.o.",
  reach: "Zadzwoń: 61 123 45 67",
};

beforeEach(() => {
  next = { status: "sent" };
  verify = undefined;
});
afterEach(cleanup);

async function submit() {
  act(() => verify?.());
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Wyślij wiadomość" }));
  });
}

describe("the contact form", () => {
  it("has its fields, says who handles the data, asks not to write about health", () => {
    render(<ContactForm {...props} />);
    for (const label of ["Imię", "E-mail", "Telefon", "Wiadomość"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(
      screen.getByRole("checkbox", { name: /Kolor Sensu sp\. z o\.o\./ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "polityce prywatności" }),
    ).toHaveAttribute("href", "/polityka-prywatnosci");
    expect(
      screen.getByText(/nie opisuj tu swojego zdrowia/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Pomoc w kryzysie" }),
    ).toHaveAttribute("href", "/pomoc-w-kryzysie");
  });

  it("can be sent only once Turnstile has checked", () => {
    render(<ContactForm {...props} />);
    const send = screen.getByRole("button", { name: "Wyślij wiadomość" });
    expect(send).toBeDisabled();
    act(() => verify?.());
    expect(send).toBeEnabled();
  });

  it("shows each error at its field, keeping what was typed", async () => {
    next = {
      status: "invalid",
      errors: { email: "Podaj poprawny adres e-mail" },
      values: { name: "Ola", email: "ola@", phone: "", message: "Pytanie" },
    };
    render(<ContactForm {...props} />);
    await submit();
    const email = screen.getByLabelText("E-mail");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(/Podaj poprawny adres e-mail/);
    expect(screen.getByLabelText("Imię")).toHaveValue("Ola");
    expect(screen.getByLabelText("Wiadomość")).toHaveValue("Pytanie");
  });

  it("thanks once sent", async () => {
    render(<ContactForm {...props} />);
    await submit();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Dziękujemy, wiadomość wysłana/,
    );
    expect(
      screen.queryByRole("button", { name: "Wyślij wiadomość" }),
    ).not.toBeInTheDocument();
  });

  it("gives another way to reach the centre when sending fails", async () => {
    next = {
      status: "failed",
      values: {
        name: "Ola",
        email: "ola@example.invalid",
        phone: "",
        message: "Pytanie",
      },
    };
    render(<ContactForm {...props} />);
    await submit();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie udało się wysłać wiadomości. Zadzwoń: 61 123 45 67",
    );
  });
});
