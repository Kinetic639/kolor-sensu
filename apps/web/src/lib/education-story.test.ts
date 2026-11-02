import { describe, expect, it } from "vitest";
import { selectStoryItems } from "./education-story";
describe("education story material selection", () => {
  const items = [
    { id: "new" },
    { id: "old" },
    { id: "third" },
    { id: "fourth" },
  ];
  it("caps automatic articles at three", () =>
    expect(
      selectStoryItems(items, { type: "articles", source: "auto", ids: [] }, 3),
    ).toEqual(items.slice(0, 3)));
  it("honors manual order and omits withdrawn references", () =>
    expect(
      selectStoryItems(
        items,
        { type: "ebooks", source: "manual", ids: ["old", "withdrawn", "new"] },
        2,
      ),
    ).toEqual([items[1], items[0]]));
  it("allows a caller to use the photo fallback when every choice disappears", () =>
    expect(
      selectStoryItems(
        [],
        { type: "workshops", source: "manual", ids: ["gone"] },
        1,
      ),
    ).toEqual([]));
});
