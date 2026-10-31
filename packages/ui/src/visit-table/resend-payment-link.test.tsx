import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "../toast";
import { describe, expect, it, vi } from "vitest";
import { ResendPaymentLinkButton } from "./resend-payment-link";

vi.mock("../toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("ResendPaymentLinkButton", () => {
  it("sends the link again and says so", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true, emailed: "sent" });
    render(<ResendPaymentLinkButton action={action} visitId="visit-1" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Wyślij link do płatności" }),
    );
    expect(action).toHaveBeenCalledWith("visit-1");
    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Wysłaliśmy klientowi link do płatności.",
      ),
    );
  });

  it("a confirmed visit: its confirmation with the visit's link (Klient · 6, card 7)", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true, emailed: "sent" });
    render(
      <ResendPaymentLinkButton action={action} confirmed visitId="visit-1" />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Wyślij link do wizyty" }),
    );
    expect(action).toHaveBeenCalledWith("visit-1");
    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Wysłaliśmy klientowi potwierdzenie z linkiem do wizyty.",
      ),
    );
  });

  it("says why not", async () => {
    const action = vi
      .fn()
      .mockResolvedValue({ ok: false, message: "Link wysłano przed chwilą." });
    render(<ResendPaymentLinkButton action={action} visitId="visit-1" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Wyślij link do płatności" }),
    );
    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Link wysłano przed chwilą."),
    );
  });
});
