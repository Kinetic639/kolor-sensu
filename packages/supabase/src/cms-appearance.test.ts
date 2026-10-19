import { defaultSiteAppearance } from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  getPublishedSiteAppearance,
  publishSiteAppearance,
  updateSiteAppearanceDraft,
} from "./cms";

// The site's shared settings, one site_content row (site_appearance), read
// and written like the other CMS content.

const look = {
  watercolorBackdropPath: "appearance/a.webp",
  watercolorParallaxPath: null,
};

function reading(payload: unknown) {
  const eq = vi.fn(() => ({
    maybeSingle: vi.fn().mockResolvedValue({
      data: payload === null ? null : { key: "x", published_payload: payload },
      error: null,
    }),
  }));
  return { eq, client: { from: () => ({ select: () => ({ eq }) }) } as never };
}

describe("the site's published shared settings", () => {
  it("are the site's own look until published", async () => {
    const { eq, client } = reading(null);
    expect(await getPublishedSiteAppearance(client)).toEqual(
      defaultSiteAppearance,
    );
    expect(eq).toHaveBeenCalledWith("key", "site_appearance");
  });

  it("read as published", async () => {
    const { client } = reading(look);
    expect(await getPublishedSiteAppearance(client)).toEqual(look);
  });
});

describe("the admin's shared settings", () => {
  it("save the draft and publish it under their key", async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: { draft_payload: look }, error: null });
    const eq = vi.fn(() => ({ select: () => ({ single }) }));
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { from: () => ({ update: () => ({ eq }) }), rpc } as never;
    expect(await updateSiteAppearanceDraft(client, look)).toEqual(look);
    expect(eq).toHaveBeenCalledWith("key", "site_appearance");
    await publishSiteAppearance(client);
    expect(rpc).toHaveBeenCalledWith("publish_site_content", {
      p_key: "site_appearance",
    });
  });
});
