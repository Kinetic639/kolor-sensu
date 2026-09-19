import { describe, expect, it } from "vitest";
import { createDisclosureStore } from "./create-disclosure-store.js";

describe("createDisclosureStore", () => {
  it("creates isolated local UI stores", () => {
    const firstStore = createDisclosureStore();
    const secondStore = createDisclosureStore();

    firstStore.getState().open();

    expect(firstStore.getState().isOpen).toBe(true);
    expect(secondStore.getState().isOpen).toBe(false);
  });
});
