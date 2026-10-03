import type { SettlementView } from "@repo/scheduling";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "./toast";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettlementList } from "./settlement-list";

const router = { refresh: vi.fn(), push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./toast", () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

const item: SettlementView = {
  id: "visit-1",
  reference: "2610-004",
  title: "Zwrot nie doszedł do skutku",
  description: "Jan Kowalski · 2610-004 · sob. 03.10, 11:00 · od 01.10",
  owedMinor: 5000,
  owed: "50 zł",
  clientName: "Jan Kowalski",
  href: "/rezerwacje?wizyta=visit-1",
};

beforeEach(() => {
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.warning).mockReset();
  vi.mocked(toast.error).mockReset();
  router.refresh.mockReset();
});

describe("SettlementList", () => {
  it("shows what is owed and to whom, with the visit", () => {
    render(<SettlementList action={vi.fn()} items={[item]} />);
    const list = screen.getByRole("list", { name: "Do rozliczenia" });
    expect(list).toHaveTextContent("Zwrot nie doszedł do skutku");
    expect(list).toHaveTextContent("50 zł");
    expect(screen.getByRole("link", { name: "Szczegóły" })).toHaveAttribute(
      "href",
      "/rezerwacje?wizyta=visit-1",
    );
  });

  it("gives it back only once confirmed, then refreshes", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true });
    render(<SettlementList action={action} items={[item]} />);
    await userEvent.click(screen.getByRole("button", { name: "Zwróć 50 zł" }));
    expect(action).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Zwrócić 50 zł klientowi Jan Kowalski?");
    await userEvent.click(
      screen.getAllByRole("button", { name: "Zwróć 50 zł" }).at(-1)!,
    );
    expect(action).toHaveBeenCalledWith("visit-1");
    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Zwrot 50 zł zlecony"),
    );
    expect(router.refresh).toHaveBeenCalled();
  });

  it("says when Stripe refused again, or why not", async () => {
    const action = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, refundFailed: true })
      .mockResolvedValueOnce({
        ok: false,
        message: "Ta wizyta jest już rozliczona.",
      });
    render(<SettlementList action={action} items={[item]} />);
    for (let i = 0; i < 2; i += 1) {
      await userEvent.click(
        screen.getAllByRole("button", { name: "Zwróć 50 zł" })[0]!,
      );
      await userEvent.click(
        screen.getAllByRole("button", { name: "Zwróć 50 zł" }).at(-1)!,
      );
      await vi.waitFor(() => expect(action).toHaveBeenCalledTimes(i + 1));
    }
    await vi.waitFor(() => expect(toast.warning).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Ta wizyta jest już rozliczona.");
  });

  it("nothing owed: nothing shown", () => {
    const { container } = render(
      <SettlementList action={vi.fn()} items={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
