import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DraftReview } from "./draft-review";

vi.mock("../toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const fields = [
  {
    id: "shortBio",
    label: "Krótki opis",
    currentValue: "Stary opis.",
    proposedValue: "Nowy opis.",
    changed: true,
  },
  {
    id: "languages",
    label: "Języki",
    currentValue: "Polski",
    proposedValue: "Polski",
    changed: false,
  },
];

function setup(review = vi.fn().mockResolvedValue({ ok: true })) {
  render(
    <DraftReview
      fields={fields}
      name="Anna Kłobuchowska"
      review={review}
      submitted="przesłano 4 października 2026"
    />,
  );
  return review;
}

describe("DraftReview", () => {
  it("on the page, one line: waiting, when, how many changes", () => {
    setup();
    const bar = screen.getByRole("region", {
      name: "Szkic czeka na weryfikację",
    });
    expect(bar).toHaveTextContent("przesłano 4 października 2026");
    expect(bar).toHaveTextContent("1 zmiana");
    // The changes themselves only in the dialog.
    expect(screen.queryByText("Nowy opis.")).toBeNull();
  });

  it("the changes in a dialog; approved from there", async () => {
    const review = setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Przejrzyj zmiany" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Zmiany w profilu: Anna Kłobuchowska",
    });
    expect(within(dialog).getByText("Nowy opis.")).toBeInTheDocument();
    expect(within(dialog).queryByText("Języki")).toBeNull();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Zatwierdź i opublikuj" }),
    );
    expect(review).toHaveBeenCalledWith("approve", undefined);
  });

  it("rejected with a reason the specialist will read", async () => {
    const review = setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Przejrzyj zmiany" }),
    );
    const dialog = screen.getByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Odrzuć zmiany" }),
    );
    const send = within(dialog).getByRole("button", { name: "Odrzuć szkic" });
    expect(send).toBeDisabled();
    await userEvent.type(
      within(dialog).getByLabelText("Powód odrzucenia"),
      "Popraw opis.",
    );
    await userEvent.click(send);
    expect(review).toHaveBeenCalledWith("reject", "Popraw opis.");
  });
});
