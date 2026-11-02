// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { afterAll, describe, expect, it, vi } from "vitest";
import { defaultWhyUs } from "@repo/contracts";
import { WhyUsSection } from "./why-us-section";
import { mapContentViewModel } from "./view-model";
import { updateWhyUsDraftAction } from "./actions";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
afterAll(() => vi.unstubAllGlobals());

vi.mock("./actions", () => ({
  updateWhyUsDraftAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/lib/use-save", () => ({
  useSave: () => ({
    isPending: false,
    run: async (save: () => Promise<unknown>) => save(),
  }),
}));

describe("WhyUsSection icon palette", () => {
  it("saves a chosen icon on the selected fact and preserves the other facts", async () => {
    const model = mapContentViewModel({
      draft: defaultWhyUs,
      published: null,
      publishedAt: null,
      updatedAt: "2026-11-02T10:00:00Z",
    });
    render(<WhyUsSection model={model} />);
    fireEvent.click(screen.getByRole("button", { name: /Dlaczego my/ }));
    const firstPalette = screen.getAllByRole("group", {
      name: "Ikona karty",
    })[0]!;
    fireEvent.click(
      within(firstPalette).getByRole("button", { name: "Edukacja" }),
    );
    expect(
      within(firstPalette).getByRole("button", { name: "Edukacja" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Zapisz szkic" }));
    await waitFor(() =>
      expect(updateWhyUsDraftAction).toHaveBeenCalledWith({
        ...defaultWhyUs,
        facts: defaultWhyUs.facts.map((fact, index) =>
          index === 0 ? { ...fact, icon: "book-open" } : fact,
        ),
      }),
    );
  });
});
