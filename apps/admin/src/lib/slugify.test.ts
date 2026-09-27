import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("makes URL-safe slugs from Polish names", () => {
    expect(slugify("Gabinet Mokotów – ul. Żółkiewskiego")).toBe(
      "gabinet-mokotow-ul-zolkiewskiego",
    );
    expect(slugify("  Łódź  Centrum ")).toBe("lodz-centrum");
    expect(slugify("Anna Maria Kłobuchowska")).toBe("anna-maria-klobuchowska");
  });
});
