import { afterEach, describe, expect, it, vi } from "vitest";
import { settle } from "./settle";

afterEach(() => vi.restoreAllMocks());

describe("settle", () => {
  it("passes the loaded content through", async () => {
    expect(await settle("obszary", async () => ({ areas: [] }))).toEqual({
      areas: [],
    });
  });

  it("logs a failed load and gives nothing, so the other tabs still open", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await settle("specjaliści", async () => {
        throw new Error(
          "JSON object requested, multiple (or no) rows returned",
        );
      }),
    ).toBeNull();
    expect(log).toHaveBeenCalledWith(
      "[cms] specjaliści failed to load:",
      expect.any(Error),
    );
  });
});
