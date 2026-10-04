import { arrangeOffer } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { offerBlocks } from "./offer-blocks";

const service = (
  id: string,
  sortOrder: number,
  catalogId: string | null = null,
) => ({
  id,
  name: id,
  sortOrder,
  catalogId,
});

describe("offerBlocks", () => {
  it("runs of loose services, each catalogue apart, places counted on", () => {
    const blocks = offerBlocks(
      arrangeOffer(
        [
          service("a", 1),
          service("b", 2),
          service("c", 1, "terapie"),
          service("d", 2, "terapie"),
          service("e", 4),
        ],
        [{ id: "terapie", name: "Terapie", sortOrder: 3 }],
      ),
    );
    expect(
      blocks.map((block) => [
        block.catalog?.name ?? null,
        block.services.map((one) => one.id),
        block.from,
      ]),
    ).toEqual([
      [null, ["a", "b"], 0],
      ["Terapie", ["c", "d"], 2],
      [null, ["e"], 4],
    ]);
  });
});
