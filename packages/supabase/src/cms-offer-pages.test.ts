import {
  defaultOfferPage,
  defaultPricesPage,
  defaultServicePage,
} from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  getPublishedOfferPage,
  getPublishedPricesPage,
  getPublishedServicePage,
  publishOfferPage,
  publishPricesPage,
  publishServicePage,
  updateOfferPageDraft,
  updatePricesPageDraft,
  updateServicePageDraft,
} from "./cms";

// The offer pages' words added on 20.10, read and written as every CMS
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

describe("the offer pages' words", () => {
  const cases = [
    [
      getPublishedOfferPage,
      updateOfferPageDraft,
      publishOfferPage,
      "offer_page",
      defaultOfferPage,
    ],
    [
      getPublishedServicePage,
      updateServicePageDraft,
      publishServicePage,
      "service_page",
      defaultServicePage,
    ],
    [
      getPublishedPricesPage,
      updatePricesPageDraft,
      publishPricesPage,
      "prices_page",
      defaultPricesPage,
    ],
  ] as const;

  it("are the site's own until published", async () => {
    for (const [read, , , key, fallback] of cases) {
      const { eq, client } = readingNothing();
      expect(await read(client)).toEqual(fallback);
      expect(eq).toHaveBeenCalledWith("key", key);
    }
  });

  it("are saved and published under their keys", async () => {
    for (const [, update, publish, key, content] of cases) {
      const { eq, rpc, client } = saving(content);
      expect(await update(client, content as never)).toEqual(content);
      await publish(client);
      expect(eq).toHaveBeenCalledWith("key", key);
      expect(rpc).toHaveBeenCalledWith("publish_site_content", { p_key: key });
    }
  });
});
