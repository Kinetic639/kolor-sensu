import { describe, expect, it, vi } from "vitest";
import { closeVisit, ClosingError, getVisitClosure } from "./visit-closing";

describe("closeVisit", () => {
  it("sends the outcome, tags and note; a refusal comes with its code", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({
        error: { message: "Only a held visit", hint: "not_closable" },
      });
    await closeVisit({ rpc } as never, "v-1", {
      outcome: "no_show",
      tags: ["late"],
      note: null,
    });
    expect(rpc).toHaveBeenCalledWith("close_visit", {
      p_visit: "v-1",
      p_outcome: "no_show",
      p_tags: ["late"],
      p_note: undefined,
    });
    await expect(
      closeVisit({ rpc } as never, "v-1", {
        outcome: "attended",
        tags: [],
        note: null,
      }),
    ).rejects.toEqual(expect.any(ClosingError));
  });
});

describe("getVisitClosure", () => {
  it("how it was closed, or none", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            outcome: "attended",
            tags: ["shortened"],
            note: "Klient poprosił o skrócenie.",
            closed_at: "2026-10-05T10:00:00Z",
            closed_by_name: "Anna Nowak",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });
    await expect(getVisitClosure({ rpc } as never, "v-1")).resolves.toEqual({
      outcome: "attended",
      tags: ["shortened"],
      note: "Klient poprosił o skrócenie.",
      closedAt: "2026-10-05T10:00:00Z",
      closedByName: "Anna Nowak",
    });
    await expect(getVisitClosure({ rpc } as never, "v-2")).resolves.toBeNull();
  });
});
