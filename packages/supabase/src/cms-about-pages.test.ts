import {
  defaultAboutHeaders,
  defaultAboutPage,
  defaultClosingCta,
  defaultContactPage,
  defaultSiteContact,
  defaultSpecialistsPage,
} from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  getPublishedAboutHeaders,
  getPublishedAboutPage,
  getPublishedClosingCta,
  getPublishedContactPage,
  getPublishedSiteContact,
  getPublishedSpecialistsPage,
  publishAboutPage,
  publishContactPage,
  updateAboutPageDraft,
  updateContactPageDraft,
} from "./cms";

// The "O nas" pages' words and the shared settings added on 19.10, read
// and written as every CMS section: one site_content row each.

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

describe("before anything is published", () => {
  it("shows the site's own words under each key", async () => {
    const cases = [
      [getPublishedAboutPage, "about_page", defaultAboutPage],
      [getPublishedAboutHeaders, "about_headers", defaultAboutHeaders],
      [getPublishedSpecialistsPage, "specialists_page", defaultSpecialistsPage],
      [getPublishedContactPage, "contact_page", defaultContactPage],
      [getPublishedClosingCta, "closing_cta", defaultClosingCta],
      [getPublishedSiteContact, "site_contact", defaultSiteContact],
    ] as const;
    for (const [read, key, fallback] of cases) {
      const { eq, client } = readingNothing();
      expect(await read(client)).toEqual(fallback);
      expect(eq).toHaveBeenCalledWith("key", key);
    }
  });
});

describe("saving and publishing", () => {
  it("writes O nas and Kontakt under their keys", async () => {
    const cases = [
      [updateAboutPageDraft, publishAboutPage, "about_page", defaultAboutPage],
      [
        updateContactPageDraft,
        publishContactPage,
        "contact_page",
        defaultContactPage,
      ],
    ] as const;
    for (const [update, publish, key, content] of cases) {
      const { eq, rpc, client } = saving(content);
      expect(await update(client, content as never)).toEqual(content);
      await publish(client);
      expect(eq).toHaveBeenCalledWith("key", key);
      expect(rpc).toHaveBeenCalledWith("publish_site_content", { p_key: key });
    }
  });

  it("refuses a value card too many", async () => {
    const { client } = saving(defaultAboutPage);
    await expect(
      updateAboutPageDraft(client, {
        ...defaultAboutPage,
        values: [...defaultAboutPage.values, defaultAboutPage.values[0]!],
      }),
    ).rejects.toThrow();
  });
});
