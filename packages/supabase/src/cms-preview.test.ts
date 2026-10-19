import { defaultWhyUs } from "@repo/contracts";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  getPublishedHomeContent,
  getPublishedSupportAreas,
  getPublishedWhyUs,
  getSiteContentDraftVersion,
  readSiteContentDraft,
  withSiteContentDrafts,
} from "./cms";

// The site's preview (issue #109): a client passed through
// withSiteContentDrafts reads every section's draft instead of its
// published content; any other client reads the published content only.

const publishedWhyUs = {
  visible: true,
  facts: [
    { title: "Opublikowane", text: "Jeden." },
    { title: "Opublikowane", text: "Dwa." },
  ],
};
const draftWhyUs = {
  visible: true,
  facts: [
    { title: "Szkic", text: "Jeden." },
    { title: "Szkic", text: "Dwa." },
  ],
};

function publicClient(published: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: published ? { key: "x", published_payload: published } : null,
    error: null,
  });
  const from = vi.fn(() => ({
    select: () => ({ eq: () => ({ maybeSingle }) }),
  }));
  const getPublicUrl = (path: string) => ({
    data: { publicUrl: `https://cdn.example.invalid/${path}` },
  });
  return {
    client: {
      from,
      storage: { from: () => ({ getPublicUrl }) },
    } as unknown as SupabaseClient<Database>,
    from,
  };
}

describe("withSiteContentDrafts", () => {
  it("reads the published content without it", async () => {
    const { client } = publicClient(publishedWhyUs);
    expect(await getPublishedWhyUs(client)).toEqual(publishedWhyUs);
  });

  it("reads the draft through the reader with it, not the table", async () => {
    const { client, from } = publicClient(publishedWhyUs);
    const readDraft = vi.fn().mockResolvedValue(draftWhyUs);
    const preview = withSiteContentDrafts(client, readDraft);

    expect(await getPublishedWhyUs(preview)).toEqual(draftWhyUs);
    expect(readDraft).toHaveBeenCalledWith("why_us");
    expect(from).not.toHaveBeenCalled();
  });

  it("falls back to the section's default when there is no draft", async () => {
    const { client } = publicClient(publishedWhyUs);
    const preview = withSiteContentDrafts(client, async () => null);
    expect(await getPublishedWhyUs(preview)).toEqual(defaultWhyUs);
  });

  it("validates the draft like the published content", async () => {
    const { client } = publicClient(null);
    const preview = withSiteContentDrafts(client, async () => ({
      visible: "yes",
    }));
    await expect(getPublishedWhyUs(preview)).rejects.toThrow();
  });

  it("covers the sections with their own shape too", async () => {
    const { client } = publicClient(null);
    const preview = withSiteContentDrafts(client, async (key) =>
      key === "home"
        ? { heading: "Szkic hero", body: "Treść szkicu." }
        : {
            areas: [
              {
                id: "lek",
                title: "Lęk",
                lead: "Szkic.",
                imagePath: "support-areas/a.webp",
                imageAlt: "",
                link: null,
              },
            ],
          },
    );

    expect((await getPublishedHomeContent(preview))?.heading).toBe(
      "Szkic hero",
    );
    const areas = await getPublishedSupportAreas(preview);
    expect(areas?.[0]?.image?.src).toBe(
      "https://cdn.example.invalid/support-areas/a.webp",
    );
  });

  it("marks only the client it was given", async () => {
    const marked = publicClient(publishedWhyUs).client;
    const other = publicClient(publishedWhyUs).client;
    withSiteContentDrafts(marked, async () => draftWhyUs);
    expect(await getPublishedWhyUs(other)).toEqual(publishedWhyUs);
  });
});

describe("readSiteContentDraft", () => {
  it("reads one draft through the service-role function", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: draftWhyUs, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    expect(await readSiteContentDraft(client, "why_us")).toEqual(draftWhyUs);
    expect(rpc).toHaveBeenCalledWith("get_site_content_draft", {
      p_key: "why_us",
    });
  });

  it("throws the database's refusal", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error("denied") });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    await expect(readSiteContentDraft(client, "home")).rejects.toThrow(
      "denied",
    );
  });
});

describe("getSiteContentDraftVersion", () => {
  it("returns when the content last changed", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: "2026-10-19T12:00:00+00:00",
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    expect(await getSiteContentDraftVersion(client)).toBe(
      "2026-10-19T12:00:00+00:00",
    );
    expect(rpc).toHaveBeenCalledWith("get_site_content_draft_version");
  });
});
