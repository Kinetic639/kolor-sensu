import { describe, expect, it } from "vitest";
import { arrangeOffer, catalogAnchor, flattenOffer } from "./offer-layout";

const service = (
  id: string,
  sortOrder: number,
  catalogId: string | null = null,
) => ({ id, name: `Usługa ${id}`, sortOrder, catalogId });

const catalogs = [
  { id: "terapie", name: "Terapie", sortOrder: 2 },
  { id: "puste", name: "Puste", sortOrder: 3 },
];

describe("arrangeOffer", () => {
  it("one list of the loose services and the catalogues, each with its own, in order", () => {
    const offer = arrangeOffer(
      [
        service("par", 2, "terapie"),
        service("konsultacja", 1),
        service("indywidualna", 1, "terapie"),
        service("dzieci", 4),
      ],
      catalogs,
    );
    expect(
      offer.map((entry) =>
        entry.kind === "service"
          ? entry.service.id
          : [entry.catalog.id, entry.services.map((one) => one.id)],
      ),
    ).toEqual(["konsultacja", ["terapie", ["indywidualna", "par"]], "dzieci"]);
  });

  it("an empty catalogue is left out, unless asked for (the admin's editor)", () => {
    const shown = arrangeOffer([service("a", 1)], catalogs, {
      keepEmpty: true,
    });
    expect(shown.map((entry) => entry.kind)).toEqual([
      "service",
      "catalog",
      "catalog",
    ]);
  });

  it("a service of an unknown catalogue stands alone", () => {
    const [entry] = arrangeOffer([service("a", 1, "gone")], []);
    expect(entry).toEqual({
      kind: "service",
      service: service("a", 1, "gone"),
    });
  });

  it("the same place: by name", () => {
    const offer = arrangeOffer(
      [
        { id: "b", name: "Bez", sortOrder: 0, catalogId: null },
        { id: "a", name: "Ala", sortOrder: 0, catalogId: null },
      ],
      [],
    );
    expect(
      offer.map((entry) => entry.kind === "service" && entry.service.id),
    ).toEqual(["a", "b"]);
  });
});

describe("flattenOffer", () => {
  it("the services in the offer's order, each with its catalogue", () => {
    const flat = flattenOffer(
      arrangeOffer(
        [
          service("par", 2, "terapie"),
          service("konsultacja", 1),
          service("indywidualna", 1, "terapie"),
        ],
        catalogs,
      ),
    );
    expect(
      flat.map((one) => [one.service.id, one.catalog?.name ?? null]),
    ).toEqual([
      ["konsultacja", null],
      ["indywidualna", "Terapie"],
      ["par", "Terapie"],
    ]);
  });
});

describe("catalogAnchor", () => {
  it("the name in plain letters, words joined by dashes", () => {
    expect(catalogAnchor("Dzieci i młodzież")).toBe("dzieci-i-mlodziez");
    expect(catalogAnchor("  Terapie (par) ")).toBe("terapie-par");
    expect(catalogAnchor("!!!")).toBe("katalog");
  });
});
