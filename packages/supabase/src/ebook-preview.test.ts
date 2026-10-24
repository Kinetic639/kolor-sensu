import { emptyEbookDraft } from "@repo/contracts/education";
import { describe, expect, it, vi } from "vitest";
import { getEbookDraftPreview } from "./education";

// The admin's preview of an e-book's draft (#197): its draft, read by id,
// as the page shows a published one.

function reading(row: unknown) {
  const eq = vi.fn(() => ({
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  }));
  const select = vi.fn(() => ({ eq }));
  return { eq, select, client: { from: () => ({ select }) } as never };
}

describe("getEbookDraftPreview", () => {
  it("shows the draft as the page shows a published e-book", async () => {
    const draft = { ...emptyEbookDraft("lek"), title: "O lęku" };
    const { eq, client } = reading({ id: "e1", draft });
    const ebook = await getEbookDraftPreview(client, "e1");
    expect(eq).toHaveBeenCalledWith("id", "e1");
    expect(ebook).toMatchObject({ id: "e1", slug: "lek", title: "O lęku" });
  });

  it("is null for no such e-book", async () => {
    expect(await getEbookDraftPreview(reading(null).client, "x")).toBeNull();
  });
});
