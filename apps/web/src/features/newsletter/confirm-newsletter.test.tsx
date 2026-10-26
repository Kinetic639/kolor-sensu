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
import type { NewsletterConfirmResult } from "./newsletter-shared";

// The newsletter's confirmation page (the link from the e-mail): a button,
// not the link alone, sends the token; then "Gotowe", "already on the list",
// a link that expired or was replaced (with the way to sign up again), or a
// failure that keeps the button for another try. Without a code the page
// says so and has no button. The Server Action stands in.

let next: NewsletterConfirmResult = { status: "confirmed" };
const action = vi.fn(
  async (_previous: NewsletterConfirmResult, _form: FormData) => next,
);
vi.mock("./actions", () => ({ confirmNewsletterAction: action }));

const { ConfirmNewsletter } = await import("./confirm-newsletter");
const { default: ConfirmNewsletterPage } =
  await import("@/app/newsletter/potwierdz/page");

beforeEach(() => {
  next = { status: "confirmed" };
  action.mockClear();
});
afterEach(cleanup);

async function confirm() {
  render(<ConfirmNewsletter token="secret-token" />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Potwierdzam zapis" }));
  });
}

describe("confirming a newsletter sign-up", () => {
  it("sends the link's token only on the click, then says it is done", async () => {
    render(<ConfirmNewsletter token="secret-token" />);
    expect(action).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Potwierdzam zapis" }),
      );
    });
    expect(action.mock.calls[0]![1].get("token")).toBe("secret-token");
    expect(screen.getByRole("status")).toHaveTextContent(
      /Gotowe, jesteś na liście/,
    );
    expect(
      screen.getByRole("link", { name: /Wróć na stronę główną/ }),
    ).toHaveAttribute("href", "/");
  });

  it("says when the address is on the list already", async () => {
    next = { status: "already" };
    await confirm();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Ten adres jest już na liście.",
    );
  });

  it("explains an expired or replaced link and how to sign up again", async () => {
    next = { status: "unknown" };
    await confirm();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /wygasł \(działa 7 dni\) albo został zastąpiony nowszym\. Zapisz się jeszcze raz/,
    );
  });

  it("keeps the button after a failure, for another try", async () => {
    next = { status: "failed" };
    await confirm();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie udało się potwierdzić zapisu.",
    );
    expect(
      screen.getByRole("button", { name: "Potwierdzam zapis" }),
    ).toBeEnabled();
  });
});

describe("the confirmation page", () => {
  it("says a link without its code is broken, with no button", async () => {
    render(
      await ConfirmNewsletterPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      } as never),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Potwierdź zapis/,
    );
    expect(screen.getByText(/W tym linku brakuje kodu/)).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("has the button for a link with its code", async () => {
    render(
      await ConfirmNewsletterPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ token: "secret-token" }),
      } as never),
    );
    expect(
      screen.getByRole("button", { name: "Potwierdzam zapis" }),
    ).toBeVisible();
  });
});
