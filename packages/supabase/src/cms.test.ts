import {
  defaultRoomsPageContent,
  homePageContentSchema,
  roomsPageContentSchema,
} from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  getPublishedRoomsPageContent,
  getPublishedSupportAreas,
  publishRoomsPageContent,
  publishSupportAreas,
  updateRoomsPageDraft,
  updateSupportAreasDraft,
  uploadSupportAreaImage,
} from "./cms";

describe("home page content schema", () => {
  it("accepts a well-formed payload", () => {
    expect(
      homePageContentSchema.safeParse({
        heading: "Kolor Sensu",
        body: "Centrum Psychoterapii.",
        buttonLabel: null,
      }).success,
    ).toBe(true);
  });

  it("applies a null default when buttonLabel is omitted", () => {
    const result = homePageContentSchema.parse({
      heading: "Kolor Sensu",
      body: "Centrum Psychoterapii.",
    });
    expect(result.buttonLabel).toBeNull();
  });

  it("rejects an empty heading or body", () => {
    expect(
      homePageContentSchema.safeParse({ heading: "", body: "Treść." }).success,
    ).toBe(false);
    expect(
      homePageContentSchema.safeParse({ heading: "Nagłówek", body: "" })
        .success,
    ).toBe(false);
  });

  it("rejects a malformed payload missing required fields", () => {
    expect(
      homePageContentSchema.safeParse({ heading: "Only heading" }).success,
    ).toBe(false);
    expect(homePageContentSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown fields instead of silently stripping them", () => {
    expect(
      homePageContentSchema.safeParse({
        heading: "Kolor Sensu",
        body: "Centrum Psychoterapii.",
        sections: [{ type: "hero" }],
      }).success,
    ).toBe(false);
  });
});

describe("rooms page content", () => {
  it("accepts the two section switches and nothing else", () => {
    expect(
      roomsPageContentSchema.safeParse({
        showAmenitiesSection: false,
        showLocationDetails: true,
      }).success,
    ).toBe(true);
    expect(
      roomsPageContentSchema.safeParse({
        showAmenitiesSection: true,
        showLocationDetails: true,
        heading: "Gabinety",
      }).success,
    ).toBe(false);
  });

  it("shows every section when nothing is published yet", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
    } as never;

    expect(await getPublishedRoomsPageContent(client)).toEqual(
      defaultRoomsPageContent,
    );
    expect(defaultRoomsPageContent).toEqual({
      showAmenitiesSection: true,
      showLocationDetails: true,
    });
  });

  it("reads the published switches", async () => {
    const eq = vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          key: "rooms",
          published_payload: {
            showAmenitiesSection: false,
            showLocationDetails: false,
          },
          published_at: "2026-09-27T00:00:00Z",
        },
        error: null,
      }),
    }));
    const client = { from: () => ({ select: () => ({ eq }) }) } as never;

    expect(await getPublishedRoomsPageContent(client)).toEqual({
      showAmenitiesSection: false,
      showLocationDetails: false,
    });
    expect(eq).toHaveBeenCalledWith("key", "rooms");
  });

  it("saves a draft and publishes under the rooms key", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        draft_payload: {
          showAmenitiesSection: false,
          showLocationDetails: true,
        },
      },
      error: null,
    });
    const eq = vi.fn(() => ({ select: () => ({ single }) }));
    const update = vi.fn(() => ({ eq }));
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { from: () => ({ update }), rpc } as never;

    await updateRoomsPageDraft(client, {
      showAmenitiesSection: false,
      showLocationDetails: true,
    });
    await publishRoomsPageContent(client);

    expect(update).toHaveBeenCalledWith({
      draft_payload: { showAmenitiesSection: false, showLocationDetails: true },
    });
    expect(eq).toHaveBeenCalledWith("key", "rooms");
    expect(rpc).toHaveBeenCalledWith("publish_site_content", {
      p_key: "rooms",
    });
  });
});

describe("support areas", () => {
  const stored = {
    areas: [
      {
        id: "indywidualna",
        title: "Terapia indywidualna",
        lead: "Przestrzeń na Ciebie.",
        imagePath: "support-areas/a.webp",
        imageAlt: "Gabinet",
        link: null,
      },
      {
        id: "warsztaty",
        title: "Warsztaty",
        lead: "Rozwój w grupie.",
        imagePath: null,
        imageAlt: "",
        link: { href: "/warsztaty", label: "Zobacz warsztaty" },
      },
    ],
  };

  function publicClient(published: unknown) {
    const eq = vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({
        data: published
          ? { key: "support_areas", published_payload: published }
          : null,
        error: null,
      }),
    }));
    const getPublicUrl = vi.fn((path: string) => ({
      data: { publicUrl: `https://cdn.test/site-media/${path}` },
    }));
    const from = vi.fn(() => ({ getPublicUrl }));
    const client = {
      from: () => ({ select: () => ({ eq }) }),
      storage: { from },
    } as never;
    return { client, eq, from };
  }

  it("reads nothing when the areas were never published", async () => {
    const { client } = publicClient(null);
    expect(await getPublishedSupportAreas(client)).toBeNull();
  });

  it("reads the published areas, each photo as a public address", async () => {
    const { client, eq, from } = publicClient(stored);
    const areas = await getPublishedSupportAreas(client);

    expect(eq).toHaveBeenCalledWith("key", "support_areas");
    expect(from).toHaveBeenCalledWith("site-media");
    expect(areas).toEqual([
      {
        id: "indywidualna",
        title: "Terapia indywidualna",
        lead: "Przestrzeń na Ciebie.",
        image: {
          src: "https://cdn.test/site-media/support-areas/a.webp",
          alt: "Gabinet",
        },
        link: null,
      },
      {
        id: "warsztaty",
        title: "Warsztaty",
        lead: "Rozwój w grupie.",
        image: null,
        link: { href: "/warsztaty", label: "Zobacz warsztaty" },
      },
    ]);
  });

  it("saves the draft and publishes under the support_areas key", async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: { draft_payload: stored }, error: null });
    const eq = vi.fn(() => ({ select: () => ({ single }) }));
    const update = vi.fn(() => ({ eq }));
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { from: () => ({ update }), rpc } as never;

    expect(await updateSupportAreasDraft(client, stored)).toEqual(stored);
    await publishSupportAreas(client);

    expect(update).toHaveBeenCalledWith({ draft_payload: stored });
    expect(eq).toHaveBeenCalledWith("key", "support_areas");
    expect(rpc).toHaveBeenCalledWith("publish_site_content", {
      p_key: "support_areas",
    });
  });

  it("refuses a draft the schema refuses, before writing anything", async () => {
    const update = vi.fn();
    const client = { from: () => ({ update }) } as never;
    await expect(
      updateSupportAreasDraft(client, { areas: [] }),
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });

  it("uploads an area's photo under its own new name", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ upload }));
    const client = { storage: { from } } as never;
    const file = new File(["x"], "zdjecie.png", { type: "image/png" });

    const path = await uploadSupportAreaImage(client, file);

    expect(from).toHaveBeenCalledWith("site-media");
    expect(path).toMatch(/^support-areas\/[0-9a-f-]{36}\.png$/);
    expect(upload).toHaveBeenCalledWith(path, file, {
      contentType: "image/png",
      upsert: false,
    });
  });

  it("refuses a file that is not a JPG, PNG or WebP photo", async () => {
    const from = vi.fn();
    const client = { storage: { from } } as never;
    const file = new File(["x"], "plik.gif", { type: "image/gif" });

    await expect(uploadSupportAreaImage(client, file)).rejects.toThrow(
      "Wybierz plik JPG, PNG lub WebP.",
    );
    expect(from).not.toHaveBeenCalled();
  });
});
