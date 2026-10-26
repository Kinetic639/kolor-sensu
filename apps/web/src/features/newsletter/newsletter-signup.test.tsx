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
import type { NewsletterResult } from "./newsletter-shared";

// The newsletter form in the browser: the address and the consent (not
// ticked, naming who handles the data), Turnstile only once the form is in
// use, errors at their fields, and "check your inbox" once sent. Turnstile
// and the Server Action stand in.

let next: NewsletterResult = { status: "sent" };
const action = vi.fn(
  async (_previous: NewsletterResult, _form: FormData) => next,
);
vi.mock("./actions", () => ({ subscribeToNewsletterAction: action }));

let verify: (() => void) | undefined;
vi.mock("@/features/booking/turnstile-widget", () => ({
  TurnstileWidget: ({ onVerify }: { onVerify?: () => void }) => {
    verify = onVerify;
    return null;
  },
}));

const { NewsletterSignup } = await import("./newsletter-signup");

const props = {
  source: "home" as const,
  turnstileSiteKey: "test",
  controller: "Kolor Sensu sp. z o.o.",
};

beforeEach(() => {
  next = { status: "sent" };
  verify = undefined;
  action.mockClear();
});
afterEach(cleanup);

async function submit() {
  act(() => {
    fireEvent.focus(screen.getByLabelText("Adres e-mail"));
  });
  act(() => verify?.());
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Zapisz się" }));
  });
}

describe("the newsletter form", () => {
  it("asks for the address and a consent that is not ticked", () => {
    render(<NewsletterSignup {...props} />);
    expect(screen.getByLabelText("Adres e-mail")).toBeInTheDocument();
    const consent = screen.getByRole("checkbox", {
      name: /Administratorem danych jest Kolor Sensu sp\. z o\.o\./,
    });
    expect(consent).not.toBeChecked();
    expect(
      screen.getByRole("link", { name: "polityce prywatności" }),
    ).toHaveAttribute("href", "/polityka-prywatnosci");
  });

  it("waits for Turnstile until the form is in use", () => {
    render(<NewsletterSignup {...props} />);
    expect(verify).toBeUndefined();
    expect(screen.getByRole("button", { name: "Zapisz się" })).toBeDisabled();
    act(() => {
      fireEvent.focus(screen.getByLabelText("Adres e-mail"));
    });
    expect(verify).toBeDefined();
  });

  it("explains the disabled button on keyboard focus until verification succeeds", async () => {
    render(<NewsletterSignup {...props} />);
    fireEvent.focus(
      screen.getByRole("group", { name: "Dlaczego zapis jest niedostępny?" }),
    );
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Zapis będzie dostępny po zakończeniu weryfikacji bezpieczeństwa",
    );
    act(() => verify?.());
    expect(screen.getByRole("button", { name: "Zapisz się" })).toBeEnabled();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("sends where it came from and says to check the inbox", async () => {
    render(<NewsletterSignup {...props} source="footer" compact />);
    await submit();
    expect(action.mock.calls[0]?.[1].get("source")).toBe("footer");
    expect(screen.getByRole("status")).toHaveTextContent("Sprawdź skrzynkę");
  });

  it("keeps the footer's consent out of the initial strip and reveals it unchecked when signing up", () => {
    render(<NewsletterSignup {...props} source="footer" compact />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.focus(screen.getByLabelText("Adres e-mail"));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(
      screen.getByRole("link", { name: "polityce prywatności" }),
    ).toHaveAttribute("href", "/polityka-prywatnosci");
  });

  it("shows the errors at their fields and keeps the address", async () => {
    next = {
      status: "invalid",
      errors: { consent: "Zaznacz zgodę, żeby zapisać się na newsletter" },
      email: "ola@example.invalid",
    };
    render(<NewsletterSignup {...props} />);
    await submit();
    expect(screen.getByLabelText("Adres e-mail")).toHaveValue(
      "ola@example.invalid",
    );
    expect(
      screen.getByText("Zaznacz zgodę, żeby zapisać się na newsletter"),
    ).toBeInTheDocument();
  });

  it("says when signing up failed", async () => {
    next = { status: "failed", email: "ola@example.invalid" };
    render(<NewsletterSignup {...props} />);
    await submit();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie udało się zapisać adresu",
    );
  });
});
