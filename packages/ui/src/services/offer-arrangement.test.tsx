import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "../toast";
import { OfferArrangement, type ArrangeAction } from "./offer-arrangement";

vi.mock("../toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const item = (
  id: string,
  name: string,
  sortOrder: number,
  catalogId: string | null = null,
) => ({
  id,
  name,
  category: "psychotherapy" as const,
  paint: "sage-1" as const,
  active: true,
  publiclyVisible: true,
  catalogId,
  sortOrder,
});

const items = [
  item("konsultacja", "Konsultacja", 1),
  item("indywidualna", "Psychoterapia indywidualna", 1, "terapie"),
  item("pary", "Terapia dla par", 2, "terapie"),
  item("dzieci", "Wsparcie dla dzieci", 3),
];
const catalogs = [{ id: "terapie", name: "Terapie", sortOrder: 2 }];

describe("OfferArrangement", () => {
  beforeEach(() => vi.clearAllMocks());

  const renderIt = () => {
    const action = vi.fn<ArrangeAction>().mockResolvedValue({ ok: true });
    const onDone = vi.fn();
    render(
      <OfferArrangement
        action={action}
        catalogs={catalogs}
        items={items}
        onDone={onDone}
      />,
    );
    return { action, onDone };
  };

  it("the menu as it is: the first level, the catalogue with its services", () => {
    renderIt();
    const menu = screen.getByRole("list", { name: "Menu Oferta" });
    expect(screen.getByRole("textbox", { name: "Nazwa katalogu" })).toHaveValue(
      "Terapie",
    );
    const inside = within(menu).getByRole("list", {
      name: "Usługi w katalogu: Terapie",
    });
    expect(inside).toHaveTextContent("Psychoterapia indywidualna");
    expect(inside).toHaveTextContent("Terapia dla par");
    expect(screen.getByRole("button", { name: "Zapisz układ" })).toBeDisabled();
  });

  it("moves a service into a catalogue, makes one, and saves it all at once", async () => {
    const { action, onDone } = renderIt();
    await userEvent.click(screen.getByRole("button", { name: "Nowy katalog" }));
    const names = screen.getAllByRole("textbox", { name: "Nazwa katalogu" });
    await userEvent.clear(names[1]!);
    await userEvent.type(names[1]!, "Dzieci i młodzież");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Katalog: Wsparcie dla dzieci" }),
      "Dzieci i młodzież",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Katalog: Terapia dla par" }),
      "Bez katalogu",
    );
    await userEvent.click(screen.getByRole("button", { name: "Zapisz układ" }));

    expect(action).toHaveBeenCalledWith({
      catalogs: [
        { key: "catalog:terapie", id: "terapie", name: "Terapie" },
        { key: "new:1", id: null, name: "Dzieci i młodzież" },
      ],
      order: ["konsultacja", "catalog:terapie", "new:1", "pary"],
      services: [
        { id: "konsultacja", catalogKey: null },
        { id: "indywidualna", catalogKey: "catalog:terapie" },
        { id: "dzieci", catalogKey: "new:1" },
        { id: "pary", catalogKey: null },
      ],
    });
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith("Zapisano układ oferty");
  });

  it("a catalogue removed gives its place to its services", async () => {
    const { action } = renderIt();
    await userEvent.click(
      screen.getByRole("button", { name: "Usuń katalog: Terapie" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Zapisz układ" }));
    expect(action).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogs: [],
        order: ["konsultacja", "indywidualna", "pary", "dzieci"],
      }),
    );
  });

  it("a catalogue without a name is not saved", async () => {
    renderIt();
    await userEvent.clear(
      screen.getByRole("textbox", { name: "Nazwa katalogu" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Każdy katalog musi mieć nazwę.",
    );
    expect(screen.getByRole("button", { name: "Zapisz układ" })).toBeDisabled();
  });
});
