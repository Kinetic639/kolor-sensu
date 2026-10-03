import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "../toast";
import { describe, expect, it, vi } from "vitest";
import {
  CancelVisitDialog,
  RefundVisitDialog,
  type CentreVisit,
} from "./centre-changes";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../toast", () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

const visit: CentreVisit = {
  id: "visit-1",
  reference: "3010-017",
  label: "Jan Kowalski, środa, 2 października 2030, 11:00–11:50",
  refundableMinor: 20000,
  currencyCode: "PLN",
  email: "jan@example.com",
};

describe("CancelVisitDialog", () => {
  it("gives all back by default", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true });
    render(
      <CancelVisitDialog
        action={action}
        onOpenChange={vi.fn()}
        open
        visit={visit}
      />,
    );
    expect(screen.getByLabelText("Kwota zwrotu (zł)")).toHaveValue("200");
    await userEvent.click(
      screen.getByRole("button", { name: "Odwołaj wizytę" }),
    );
    expect(action).toHaveBeenCalledWith("visit-1", {
      refundMinor: 20000,
      reason: null,
    });
    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Wizyta odwołana"),
    );
  });

  it("a late cancellation: 100 zł back, 100 zł kept, and why", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true });
    render(
      <CancelVisitDialog
        action={action}
        onOpenChange={vi.fn()}
        open
        visit={visit}
      />,
    );
    const amount = screen.getByLabelText("Kwota zwrotu (zł)");
    await userEvent.clear(amount);
    await userEvent.type(amount, "100");
    expect(screen.getByText(/Zatrzymane: 100\s?zł\./)).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText("Powód (zobaczy go klient)"),
      "Odwołanie w dniu wizyty",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Odwołaj wizytę" }),
    );
    expect(action).toHaveBeenCalledWith("visit-1", {
      refundMinor: 10000,
      reason: "Odwołanie w dniu wizyty",
    });
  });

  it("refuses more than was paid, or not an amount, before asking", async () => {
    const action = vi.fn();
    render(
      <CancelVisitDialog
        action={action}
        onOpenChange={vi.fn()}
        open
        visit={visit}
      />,
    );
    const amount = screen.getByLabelText("Kwota zwrotu (zł)");
    await userEvent.clear(amount);
    await userEvent.type(amount, "250");
    await userEvent.click(
      screen.getByRole("button", { name: "Odwołaj wizytę" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Najwyżej 200\s?zł/);
    await userEvent.clear(amount);
    await userEvent.type(amount, "abc");
    await userEvent.click(
      screen.getByRole("button", { name: "Odwołaj wizytę" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Podaj kwotę");
    expect(action).not.toHaveBeenCalled();
  });

  it("an unpaid visit: no amount, only why", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true });
    render(
      <CancelVisitDialog
        action={action}
        onOpenChange={vi.fn()}
        open
        visit={{ ...visit, refundableMinor: 0 }}
      />,
    );
    expect(
      screen.queryByLabelText("Kwota zwrotu (zł)"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "nie ma czego zwracać",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Odwołaj wizytę" }),
    );
    expect(action).toHaveBeenCalledWith("visit-1", {
      refundMinor: null,
      reason: null,
    });
  });
});

describe("RefundVisitDialog", () => {
  it("gives back what the admin chose; says when Stripe refused", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true, refundFailed: true });
    render(
      <RefundVisitDialog
        action={action}
        onOpenChange={vi.fn()}
        open
        visit={{ ...visit, refundableMinor: 15000 }}
      />,
    );
    const amount = screen.getByLabelText("Kwota zwrotu (zł)");
    await userEvent.clear(amount);
    await userEvent.type(amount, "50,50");
    await userEvent.click(
      screen.getByRole("button", { name: "Zwróć pieniądze" }),
    );
    expect(action).toHaveBeenCalledWith("visit-1", {
      refundMinor: 5050,
      reason: null,
    });
    await vi.waitFor(() => expect(toast.warning).toHaveBeenCalled());
  });

  it("nothing to give back is not a refund", async () => {
    const action = vi.fn();
    render(
      <RefundVisitDialog
        action={action}
        onOpenChange={vi.fn()}
        open
        visit={visit}
      />,
    );
    const amount = screen.getByLabelText("Kwota zwrotu (zł)");
    await userEvent.clear(amount);
    await userEvent.type(amount, "0");
    await userEvent.click(
      screen.getByRole("button", { name: "Zwróć pieniądze" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Podaj kwotę zwrotu.");
    expect(action).not.toHaveBeenCalled();
  });
});
