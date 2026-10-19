import { defaultPageSeo } from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  getPageSeoAdmin,
  getPublishedPageSeo,
  publishPageSeo,
  updatePageSeoDraft,
} from "./cms";

// Every page's search and sharing settings, one site_content row per page
// (seo_<page>), read and written like the other CMS content.

function reading(payload: unknown) {
  const eq = vi.fn(() => ({
    maybeSingle: vi.fn().mockResolvedValue({
      data: payload === null ? null : { key: "x", published_payload: payload },
      error: null,
    }),
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

const about = {
  ...defaultPageSeo,
  title: "O nas | Kolor Sensu",
  ogImagePath: "seo/a.jpg",
  ogImageAlt: "Gabinet",
};

describe("a page's published settings", () => {
  it("are the page's own until published", async () => {
    const { eq, client } = reading(null);
    expect(await getPublishedPageSeo(client, "about")).toEqual(defaultPageSeo);
    expect(eq).toHaveBeenCalledWith("key", "seo_about");
  });

  it("read as published", async () => {
    const { client } = reading(about);
    expect(await getPublishedPageSeo(client, "crisis_help")).toEqual(about);
  });
});

describe("the admin's settings", () => {
  it("read the draft and what is published", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        draft_payload: about,
        published_payload: null,
        published_at: null,
        updated_at: "2026-10-19T10:00:00Z",
      },
      error: null,
    });
    const eq = vi.fn(() => ({ single }));
    const client = { from: () => ({ select: () => ({ eq }) }) } as never;
    expect(await getPageSeoAdmin(client, "home")).toEqual({
      draft: about,
      published: null,
      publishedAt: null,
      updatedAt: "2026-10-19T10:00:00Z",
    });
    expect(eq).toHaveBeenCalledWith("key", "seo_home");
  });

  it("save the draft and publish it under the page's key", async () => {
    const { eq, rpc, client } = saving(about);
    expect(await updatePageSeoDraft(client, "prices", about)).toEqual(about);
    await publishPageSeo(client, "prices");
    expect(eq).toHaveBeenCalledWith("key", "seo_prices");
    expect(rpc).toHaveBeenCalledWith("publish_site_content", {
      p_key: "seo_prices",
    });
  });

  it("refuse a picture without its description", async () => {
    const { client } = saving(about);
    await expect(
      updatePageSeoDraft(client, "prices", { ...about, ogImageAlt: "" }),
    ).rejects.toThrow();
  });
});
