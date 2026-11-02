// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TurnstileEvents } from "./turnstile-widget";

// The check itself is Cloudflare's: here it is a stand-in whose events the
// test fires, and the hold (a server action) is never sent.
let events: TurnstileEvents = {};
vi.mock("./turnstile-widget", () => ({
  TurnstileWidget: (props: TurnstileEvents) => {
    events = props;
    return null;
  },
}));
vi.mock("./actions", () => ({ holdTimeAction: vi.fn() }));

const { HoldTimeForm } = await import("./hold-time-form");

afterEach(cleanup);

function renderForm() {
  render(
    <HoldTimeForm
      fields={{ usluga: "konsultacja", termin: "2030-01-07T10:00" }}
      turnstileSiteKey="test-key"
    />,
  );
  return screen.getByRole("button", { name: "Przejdź dalej" });
}

describe("HoldTimeForm", () => {
  it("automatically submits a preselected visit exactly once after verification", () => {
    const submit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => {});
    render(
      <HoldTimeForm
        autoContinue
        fields={{ usluga: "konsultacja", termin: "2030-01-07T10:00" }}
        turnstileSiteKey="test-key"
      />,
    );
    expect(submit).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Przejdź dalej" }),
    ).not.toBeInTheDocument();
    act(() => events.onError?.());
    expect(submit).not.toHaveBeenCalled();
    act(() => events.onVerify?.());
    expect(submit).toHaveBeenCalledTimes(1);
    act(() => events.onExpire?.());
    act(() => events.onVerify?.());
    expect(submit).toHaveBeenCalledTimes(1);
    submit.mockRestore();
  });
  it("waits for the bot check before it goes on", () => {
    const button = renderForm();
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(
      "Sprawdzamy, czy rezerwuje człowiek. To potrwa chwilę.",
    );

    act(() => events.onVerify?.());
    expect(button).toBeEnabled();
    expect(button).toHaveAccessibleDescription("Gotowe. Możesz przejść dalej.");
  });

  it("closes again when the check expires, and says why when it fails", () => {
    const button = renderForm();
    act(() => events.onVerify?.());
    act(() => events.onExpire?.());
    expect(button).toBeDisabled();

    act(() => events.onError?.());
    expect(button).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nie udało się potwierdzić, że rezerwuje człowiek.",
    );
  });

  it("sends the wizard's choices with the hold", () => {
    renderForm();
    const form = screen.getByRole("button").closest("form")!;
    expect(Object.fromEntries(new FormData(form))).toEqual({
      usluga: "konsultacja",
      termin: "2030-01-07T10:00",
    });
  });

  it("without cookies, holds nothing and says how to book instead (card 8)", () => {
    const enabled = vi
      .spyOn(navigator, "cookieEnabled", "get")
      .mockReturnValue(false);
    render(
      <HoldTimeForm
        fields={{ usluga: "konsultacja", termin: "2030-01-07T10:00" }}
        turnstileSiteKey="test-key"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Rezerwacja online potrzebuje niezbędnych plików cookies",
    );
    expect(
      screen.getByRole("link", { name: "Kontakt z centrum" }),
    ).toHaveAttribute("href", "/kontakt");
    expect(screen.queryByRole("button", { name: "Przejdź dalej" })).toBeNull();
    enabled.mockRestore();
  });
});
