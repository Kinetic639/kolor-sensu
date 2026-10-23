import { LEGAL_PAGES } from "@repo/contracts/cms-legal";
import { defaultLegalPages } from "@repo/contracts/cms-legal-content";
import { describe, expect, it, vi } from "vitest";
import {
  getPublishedLegalPage,
  publishLegalPage,
  updateLegalPageDraft,
} from "./cms";

// The legal documents added on 20.10, read and written as every CMS
// section: one site_content row each.

function readingNothing() {
  const eq = vi.fn(() => ({
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));
  return { eq, client: { from: () => ({ select: () => ({ eq }) }) } as never };
}

function saving(payload: unknown) {
  const single = vi
    .fn()
    .mockResolvedValue({ data: { draft_payload: payload }, error: null });
  const eq = vi.fn(() => ({ select: () => ({ single }) }));
  const rpc = vi.fn().mockResolvedValue({ error: null });
  return {
    eq,
    rpc,
    client: { from: () => ({ update: () => ({ eq }) }), rpc } as never,
  };
}

describe("the legal pages", () => {
  it("are the site's samples until published", async () => {
    for (const { key } of LEGAL_PAGES) {
      const { eq, client } = readingNothing();
      expect(await getPublishedLegalPage(client, key)).toEqual(
        defaultLegalPages[key],
      );
      expect(eq).toHaveBeenCalledWith("key", key);
    }
  });

  it("are saved and published under their keys", async () => {
    for (const { key } of LEGAL_PAGES) {
      const content = defaultLegalPages[key];
      const { eq, rpc, client } = saving(content);
      expect(await updateLegalPageDraft(client, key, content)).toEqual(content);
      await publishLegalPage(client, key);
      expect(eq).toHaveBeenCalledWith("key", key);
      expect(rpc).toHaveBeenCalledWith("publish_site_content", { p_key: key });
    }
  });
});
