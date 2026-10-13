import { afterEach, describe, expect, it, vi } from "vitest";
import { settle } from "./settle";

afterEach(() => vi.restoreAllMocks());

describe("settle", () => {
  it("passes the loaded content through", async () => {
    expect(await settle("obszary", async () => ({ areas: [] }))).toEqual({
      areas: [],
    });
  });

  it("warns of a failed load and gives nothing, so the other tabs still open", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(
      await settle("specjaliści", async () => {
        throw { code: "PGRST116", message: "Cannot coerce the result" };
      }),
    ).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "[cms] specjaliści failed to load: PGRST116 Cannot coerce the result",
    );
  });

  it("says what an Error says", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await settle("gabinety", async () => {
      throw new Error("offline");
    });
    expect(warn).toHaveBeenCalledWith("[cms] gabinety failed to load: offline");
  });
});
