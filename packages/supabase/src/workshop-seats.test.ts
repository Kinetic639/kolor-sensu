import { describe, expect, it, vi } from "vitest";
import { listWorkshopSeats } from "./workshops-admin";

// A workshop's seats for the portals' calendars (#198): the confirmed
// seats counted per workshop, with its capacity; nothing asked for none.

function client(tables: Record<string, unknown[]>) {
  const from = vi.fn((table: string) => {
    const result = { data: tables[table] ?? [], error: null };
    const chain = {
      select: () => chain,
      in: () => chain,
      eq: () => chain,
      then: (resolve: (value: typeof result) => unknown) => resolve(result),
    };
    return chain;
  });
  return { from, client: { from } as never };
}

describe("listWorkshopSeats", () => {
  it("counts the confirmed seats of each workshop, with its capacity", async () => {
    const { client: db } = client({
      workshops: [
        { id: "a", capacity: 12 },
        { id: "b", capacity: 5 },
      ],
      workshop_registrations: [
        { workshop_id: "a" },
        { workshop_id: "a" },
        { workshop_id: "a" },
      ],
    });
    const seats = await listWorkshopSeats(db, ["a", "b", "a"]);
    expect(seats.get("a")).toEqual({ confirmed: 3, capacity: 12 });
    expect(seats.get("b")).toEqual({ confirmed: 0, capacity: 5 });
  });

  it("asks nothing for no workshop", async () => {
    const { from, client: db } = client({});
    expect((await listWorkshopSeats(db, [])).size).toBe(0);
    expect(from).not.toHaveBeenCalled();
  });
});
