import { describe, expect, it } from "vitest";
import { linesToList, listToLines } from "./lines";

describe("one item per line", () => {
  it("keeps each line's words, dropping blank lines and spaces around", () => {
    expect(linesToList("  Winda \n\nPoczekalnia\n  \n")).toEqual([
      "Winda",
      "Poczekalnia",
    ]);
  });

  it("writes a list back one per line", () => {
    expect(listToLines(["Winda", "Poczekalnia"])).toBe("Winda\nPoczekalnia");
  });
});
