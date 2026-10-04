import { describe, expect, it, vi } from "vitest";
import {
  addClosures,
  deleteClosure,
  listClosures,
  saveClosure,
  visitsOnDays,
} from "./closures";

const row = {
  id: "c-1",
  starts_on: "2026-12-24",
  ends_on: "2026-12-31",
  reason: "Przerwa świąteczna",
  created_at: "2026-10-05T08:00:00Z",
};

describe("listClosures", () => {
  it("every closure, the earliest first", async () => {
    const order = vi.fn().mockResolvedValue({ data: [row], error: null });
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    await expect(listClosures({ from } as never)).resolves.toEqual([
      {
        id: "c-1",
        startsOn: "2026-12-24",
        endsOn: "2026-12-31",
        reason: "Przerwa świąteczna",
      },
    ]);
    expect(from).toHaveBeenCalledWith("centre_closures");
    expect(order).toHaveBeenCalledWith("starts_on");
  });
});

describe("saveClosure", () => {
  const input = {
    startsOn: "2026-12-24",
    endsOn: "2026-12-31",
    reason: "Przerwa świąteczna",
  };

  it("a new one", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));
    await saveClosure({ from } as never, null, input);
    expect(insert).toHaveBeenCalledWith({
      starts_on: "2026-12-24",
      ends_on: "2026-12-31",
      reason: "Przerwa świąteczna",
    });
  });

  it("a change of one", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    await saveClosure({ from } as never, "c-1", input);
    expect(eq).toHaveBeenCalledWith("id", "c-1");
  });
});

describe("addClosures", () => {
  it("several at once (the holidays)", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));
    await addClosures({ from } as never, [
      { startsOn: "2026-11-11", endsOn: "2026-11-11", reason: "Święto" },
    ]);
    expect(insert).toHaveBeenCalledWith([
      { starts_on: "2026-11-11", ends_on: "2026-11-11", reason: "Święto" },
    ]);
  });
});

describe("deleteClosure", () => {
  it("removes it", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ delete: remove }));
    await deleteClosure({ from } as never, "c-1");
    expect(eq).toHaveBeenCalledWith("id", "c-1");
  });
});

describe("visitsOnDays", () => {
  it("how many visits fall on the days", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 3, error: null });
    await expect(
      visitsOnDays({ rpc } as never, "2026-12-24", "2026-12-31"),
    ).resolves.toBe(3);
    expect(rpc).toHaveBeenCalledWith("visits_on_days", {
      p_from: "2026-12-24",
      p_to: "2026-12-31",
    });
  });
});
