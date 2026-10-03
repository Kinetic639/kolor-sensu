import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "./toast";
import { AppToaster } from "./toaster";

afterEach(() => {
  act(() => toast.dismiss());
});

describe("toast", () => {
  it("says what happened, at the top in the middle", async () => {
    const { container } = render(<AppToaster />);
    act(() => {
      toast.success("Zapisano dane klienta", {
        description: "Zmieniono też 2 nadchodzące wizyty.",
      });
    });
    const shown = await screen.findByRole("status");
    expect(shown).toHaveTextContent("Zapisano dane klienta");
    expect(shown).toHaveTextContent("Zmieniono też 2 nadchodzące wizyty.");
    expect(
      container.ownerDocument.querySelector(
        ".Toastify__toast-container--top-center",
      ),
    ).toBeInTheDocument();
  });

  it("an error is an alert", async () => {
    render(<AppToaster />);
    act(() => {
      toast.error("Nie udało się zapisać.");
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nie udało się zapisać.",
    );
  });

  it("its action runs and closes it; it can be closed by hand", async () => {
    render(<AppToaster />);
    const open = vi.fn();
    act(() => {
      toast("Nowa wizyta", {
        description: "2610-023 · Piotr Zieliński",
        action: { label: "Otwórz", onClick: open },
      });
    });
    const shown = await screen.findByRole("status");
    await userEvent.click(
      within(shown).getByRole("button", { name: "Otwórz" }),
    );
    expect(open).toHaveBeenCalledTimes(1);
    expect(
      within(shown).getByRole("button", { name: "Zamknij powiadomienie" }),
    ).toBeInTheDocument();
  });
});
