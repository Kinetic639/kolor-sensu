import { describe, expect, it } from "vitest";
import {
  addArea,
  moveArea,
  problemsOf,
  removeArea,
  toSupportAreasContent,
  updateArea,
} from "./support-areas-editor";
import type { SupportAreaRow } from "./types";

const row = (id: string, overrides: Partial<SupportAreaRow> = {}) => ({
  id,
  title: `Obszar ${id}`,
  lead: "Opis.",
  imagePath: null,
  imageAlt: "",
  link: null,
  imageUrl: null,
  ...overrides,
});

describe("the areas editor", () => {
  it("adds an empty area at the end, with an id of its own", () => {
    const areas = addArea([row("obszar-1"), row("obszar-2")]);
    expect(areas).toHaveLength(3);
    expect(areas[2]).toMatchObject({ title: "", lead: "", imagePath: null });
    expect(["obszar-1", "obszar-2"]).not.toContain(areas[2]?.id);
  });

  it("removes an area", () => {
    expect(removeArea([row("a"), row("b")], 0).map((a) => a.id)).toEqual(["b"]);
  });

  it("moves an area up or down, never past either end", () => {
    const areas = [row("a"), row("b"), row("c")];
    expect(moveArea(areas, 2, -1).map((a) => a.id)).toEqual(["a", "c", "b"]);
    expect(moveArea(areas, 0, 1).map((a) => a.id)).toEqual(["b", "a", "c"]);
    expect(moveArea(areas, 0, -1)).toBe(areas);
    expect(moveArea(areas, 2, 1)).toBe(areas);
  });

  it("changes one area's fields", () => {
    const areas = updateArea([row("a"), row("b")], 1, { title: "Nowy" });
    expect(areas[1]?.title).toBe("Nowy");
    expect(areas[0]?.title).toBe("Obszar a");
  });

  it("saves the areas without the preview addresses", () => {
    expect(
      toSupportAreasContent([
        row("a", {
          imagePath: "support-areas/a.webp",
          imageUrl: "https://cdn.test/a.webp",
        }),
      ]),
    ).toEqual({
      areas: [
        {
          id: "a",
          title: "Obszar a",
          lead: "Opis.",
          imagePath: "support-areas/a.webp",
          imageAlt: "",
          link: null,
        },
      ],
    });
  });
});

describe("problemsOf", () => {
  it("finds nothing wrong with a good list", () => {
    expect(problemsOf([row("a")])).toEqual({});
  });

  it("names each refused field of each area, saying what to do", () => {
    const problems = problemsOf([
      row("a"),
      row("b", {
        title: " ",
        link: { href: "https://example.com", label: "" },
      }),
    ]);
    expect(problems).toEqual({
      "1.title": "Podaj nazwę (do 60 znaków).",
      "1.href": "Podaj adres na stronie, zaczynający się od / (np. /oferta).",
      "1.label": "Podaj tekst linku (do 40 znaków).",
    });
  });
});
