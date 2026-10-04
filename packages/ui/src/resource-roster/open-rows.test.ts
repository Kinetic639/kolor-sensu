import { describe, expect, it } from "vitest";
import { openTab, parseAsOpenRows, withRow, withTab } from "./open-rows";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("open rows in the address", () => {
  it("each open row, with its tab when not the first", () => {
    expect(parseAsOpenRows.parse(`${A}:uslugi,${B}`)).toEqual({
      [A]: "uslugi",
      [B]: null,
    });
    expect(parseAsOpenRows.serialize({ [A]: "uslugi", [B]: null })).toBe(
      `${A}:uslugi,${B}`,
    );
    // Not ids, other keys: left out.
    expect(parseAsOpenRows.parse(`nonsense,${B}:Złe!`)).toEqual({ [B]: null });
    expect(parseAsOpenRows.parse("nonsense")).toBeNull();
  });

  it("opens and closes a row; a tab opens it too", () => {
    expect(withRow({}, A, true)).toEqual({ [A]: null });
    expect(withRow({ [A]: "uslugi" }, A, false)).toBeNull();
    expect(withTab({ [A]: null }, A, "wizyty")).toEqual({ [A]: "wizyty" });
    expect(withTab({ [A]: "wizyty" }, A, null)).toEqual({ [A]: null });
    expect(openTab({ [A]: "wizyty" }, A)).toBe("wizyty");
    expect(openTab({ [A]: null }, A)).toBeNull();
    expect(openTab(null, A)).toBeUndefined();
  });
});
