import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VisitClosingForm } from "./visit-closing-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("VisitClosingForm", () => {
  it("asks whether it took place, then sends the outcome, tags and note", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true });
    render(<VisitClosingForm action={action} closing={null} visitId="v-1" />);
    const close = screen.getByRole("button", { name: "Zamknij wizytę" });
    expect(close).toBeDisabled();
    await userEvent.click(
      screen.getByRole("radio", { name: "Klient nie przyszedł" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Spóźnienie klienta" }),
    );
    await userEvent.type(
      screen.getByLabelText("Notatka dla centrum (opcjonalnie)"),
      "Nie odbierał telefonu.",
    );
    await userEvent.click(close);
    expect(action).toHaveBeenCalledWith("v-1", {
      outcome: "no_show",
      tags: ["late"],
      note: "Nie odbierał telefonu.",
    });
  });

  it("closed: says how, and can be changed", async () => {
    render(
      <VisitClosingForm
        action={vi.fn()}
        closing={{
          outcome: "attended",
          tags: ["shortened"],
          note: null,
          closedAt: "2026-10-05T10:00:00Z",
          closedByName: "Anna Nowak",
        }}
        visitId="v-1"
      />,
    );
    expect(screen.getByText("Odbyła się")).toBeInTheDocument();
    expect(screen.getByText("Skrócona wizyta")).toBeInTheDocument();
    expect(screen.getByText("Zamknięta przez: Anna Nowak")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Zmień" }));
    expect(screen.getByRole("radio", { name: "Odbyła się" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
