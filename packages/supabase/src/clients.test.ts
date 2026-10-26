import { describe, expect, it, vi } from "vitest";
import {
  ClientError,
  clientDuplicates,
  forgetClient,
  mergeClients,
  getClient,
  listClientVisits,
  retentionPreview,
  searchClients,
  updateClient,
} from "./clients";

const row = {
  id: "client-1",
  name: "Jan Kowalski",
  email: "jan@example.invalid",
  phone: "600 100 200",
  notes: "Woli popołudnia",
  visits: 3,
  upcoming: 1,
  cancelled: 1,
  last_visit_at: "2026-09-20T08:00:00+00:00",
  next_visit_at: "2026-10-05T08:00:00+00:00",
  paid_minor: 60000,
  created_at: "2026-09-01T10:00:00+00:00",
};

const client = {
  id: "client-1",
  name: "Jan Kowalski",
  firstName: "Jan",
  lastName: "Kowalski",
  email: "jan@example.invalid",
  phone: "600 100 200",
  notes: "Woli popołudnia",
  visits: 3,
  upcoming: 1,
  cancelled: 1,
  lastVisitAt: "2026-09-20T08:00:00+00:00",
  nextVisitAt: "2026-10-05T08:00:00+00:00",
  paidMinor: 60000,
  createdAt: "2026-09-01T10:00:00+00:00",
};

describe("searchClients", () => {
  it("one page and how many in all", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: [{ ...row, total_count: 42 }], error: null });
    expect(
      await searchClients({ rpc } as never, {
        query: "jan",
        sort: "name",
        descending: false,
        limit: 25,
        offset: 25,
      }),
    ).toEqual({ clients: [client], total: 42 });
    expect(rpc).toHaveBeenCalledWith("search_clients", {
      p_query: "jan",
      p_sort: "name",
      p_desc: false,
      p_limit: 25,
      p_offset: 25,
    });
  });

  it("none found", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    expect(
      await searchClients({ rpc } as never, {
        sort: "last_visit",
        descending: true,
        limit: 25,
        offset: 0,
      }),
    ).toEqual({ clients: [], total: 0 });
  });

  it("a specialist may not", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Only the centre", code: "42501" },
    });
    await expect(
      searchClients({ rpc } as never, {
        sort: "name",
        descending: false,
        limit: 25,
        offset: 0,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("getClient and listClientVisits", () => {
  it("the card, or null", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ ...row, updated_at: "x" }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });
    expect(await getClient({ rpc } as never, "client-1")).toEqual(client);
    expect(await getClient({ rpc } as never, "nobody")).toBeNull();
  });

  it("the visits, as the bookings list reads them", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    expect(await listClientVisits({ rpc } as never, "client-1")).toEqual([]);
    expect(rpc).toHaveBeenCalledWith("list_client_visits", {
      p_client_id: "client-1",
    });
  });
});

describe("updateClient", () => {
  const details = {
    firstName: "Jan",
    lastName: "Kowalski",
    email: "jan.k@example.invalid",
    phone: null,
    notes: null,
  };

  it("says how many visits to come follow", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ id: "client-1", upcoming_updated: 2 }],
      error: null,
    });
    expect(await updateClient({ rpc } as never, "client-1", details)).toEqual({
      upcomingUpdated: 2,
    });
    expect(rpc).toHaveBeenCalledWith("admin_update_client", {
      p_id: "client-1",
      p_first_name: "Jan",
      p_last_name: "Kowalski",
      p_email: "jan.k@example.invalid",
      p_phone: null,
      p_notes: null,
    });
  });

  it("says why not", async () => {
    for (const hint of ["email_taken", "invalid_details", "not_found"]) {
      const rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "no", hint, code: "P0001" },
      });
      const error = await updateClient({ rpc } as never, "c", details).catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(ClientError);
      expect((error as ClientError).code).toBe(hint);
    }
  });
});

describe("forgetClient", () => {
  it("asks the database, which refuses while something is open", async () => {
    const rpc = vi.fn().mockResolvedValue({
      error: { message: "A visit to come.", hint: "client_busy" },
    });
    await expect(forgetClient({ rpc } as never, "c-1")).rejects.toMatchObject({
      code: "client_busy",
    });
    expect(rpc).toHaveBeenCalledWith("forget_client", { p_client: "c-1" });
  });
});

describe("retentionPreview", () => {
  it("what the next night removes", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: [{ clients: 2, intakes: 5 }], error: null });
    await expect(retentionPreview({ rpc } as never)).resolves.toEqual({
      clients: 2,
      intakes: 5,
    });
  });
});

describe("clientDuplicates and mergeClients", () => {
  it("other cards of the same person, and merging one in", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            id: "c-2",
            name: "Jan Kowalski",
            email: "jan2@example.invalid",
            phone: null,
            reason: "name",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: 3, error: null });
    await expect(clientDuplicates({ rpc } as never, "c-1")).resolves.toEqual([
      {
        id: "c-2",
        name: "Jan Kowalski",
        email: "jan2@example.invalid",
        phone: null,
        reason: "name",
      },
    ]);
    await expect(mergeClients({ rpc } as never, "c-1", "c-2")).resolves.toBe(3);
    expect(rpc).toHaveBeenLastCalledWith("merge_clients", {
      p_keep: "c-1",
      p_merge: "c-2",
    });
  });
});
