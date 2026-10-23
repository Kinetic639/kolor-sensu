// The mist of ThoughtsLens: where each letter of a negative thought drifts
// while it dissolves.
import { describe, expect, it } from "vitest";
import { letterDrift } from "./thoughts-mist";

describe("letterDrift", () => {
  it("sends each letter its own way, the same way every time", () => {
    const first = letterDrift(0);
    expect(letterDrift(0)).toEqual(first);
    expect(letterDrift(1)).not.toEqual(first);
  });

  it("stays within a small cloud around the word, rising more than falling", () => {
    for (let index = 0; index < 200; index++) {
      const { x, y, turn } = letterDrift(index);
      expect(Math.abs(x)).toBeLessThanOrEqual(1.2);
      expect(y).toBeLessThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(-1.2);
      expect(Math.abs(turn)).toBeLessThanOrEqual(40);
    }
  });
});
