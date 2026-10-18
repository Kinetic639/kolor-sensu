import {
  defaultFirstSteps,
  defaultHomeHeaders,
  defaultHomeSections,
  defaultRoomsPageContent,
  homePageContentSchema,
  roomsPageContentSchema,
} from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  getPublishedFirstSteps,
  getPublishedHomeHeaders,
  getPublishedHomeSections,
  getPublishedRoomsPageContent,
  getPublishedSupportAreas,
  publishFirstSteps,
  publishHomeHeaders,
  publishHomeSections,
  publishRoomsPageContent,
  publishSupportAreas,
  updateFirstStepsDraft,
  updateHomeHeadersDraft,
  updateHomeSectionsDraft,
  updateRoomsPageDraft,
  updateSupportAreasDraft,
  uploadSiteImage,
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

describe("home sections", () => {
  const sections = {
    showSpecialists: false,
    spotlight: {
      visible: true,
      specialistId: "6f1c2b9a-3c41-4e2b-9a55-0d3f2a7b8c10",
      imagePath: "spotlight/a.webp",
      imageAlt: "Anna",
    },
  };

  function publicClient(published: unknown) {
    const eq = vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({
        data: published
          ? { key: "home_sections", published_payload: published }
          : null,
        error: null,
      }),
    }));
    return {
      client: { from: () => ({ select: () => ({ eq }) }) } as never,
      eq,
    };
  }

  it("shows the team and hides the spotlight until something is published", async () => {
    const { client } = publicClient(null);
    expect(await getPublishedHomeSections(client)).toEqual(defaultHomeSections);
  });

  it("reads the published sections", async () => {
    const { client, eq } = publicClient(sections);
    expect(await getPublishedHomeSections(client)).toEqual(sections);
    expect(eq).toHaveBeenCalledWith("key", "home_sections");
  });

  it("saves the draft and publishes under the home_sections key", async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: { draft_payload: sections }, error: null });
    const eq = vi.fn(() => ({ select: () => ({ single }) }));
    const update = vi.fn(() => ({ eq }));
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { from: () => ({ update }), rpc } as never;

    expect(await updateHomeSectionsDraft(client, sections)).toEqual(sections);
    await publishHomeSections(client);
    expect(eq).toHaveBeenCalledWith("key", "home_sections");
    expect(rpc).toHaveBeenCalledWith("publish_site_content", {
      p_key: "home_sections",
    });
  });

  it("uploads a site photo into the folder it is for", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const client = { storage: { from: () => ({ upload }) } } as never;
    const file = new File(["x"], "anna.webp", { type: "image/webp" });

    expect(await uploadSiteImage(client, file, "spotlight")).toMatch(
      /^spotlight\/[0-9a-f-]{36}\.webp$/,
    );
  });
});

describe("first steps", () => {
  const steps = { ...defaultFirstSteps, visible: false };

  it("shows the site's own band until something is published", async () => {
    const eq = vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    const client = { from: () => ({ select: () => ({ eq }) }) } as never;
    expect(await getPublishedFirstSteps(client)).toEqual(defaultFirstSteps);
    expect(eq).toHaveBeenCalledWith("key", "first_steps");
  });

  it("saves the draft and publishes under the first_steps key", async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: { draft_payload: steps }, error: null });
    const eq = vi.fn(() => ({ select: () => ({ single }) }));
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { from: () => ({ update: () => ({ eq }) }), rpc } as never;

    expect(await updateFirstStepsDraft(client, steps)).toEqual(steps);
    await publishFirstSteps(client);
    expect(eq).toHaveBeenCalledWith("key", "first_steps");
    expect(rpc).toHaveBeenCalledWith("publish_site_content", {
      p_key: "first_steps",
    });
  });
});

describe("home headers", () => {
  const headers = {
    ...defaultHomeHeaders,
    story: {
      ...defaultHomeHeaders.story,
      eyebrow: { text: "Jak zacząć", tone: "pink" as const },
    },
  };

  it("shows the site's own headers until something is published", async () => {
    const eq = vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    const client = { from: () => ({ select: () => ({ eq }) }) } as never;
    expect(await getPublishedHomeHeaders(client)).toEqual(defaultHomeHeaders);
    expect(eq).toHaveBeenCalledWith("key", "home_headers");
  });

  // Until the migration that drops it has run, the stored headers still
  // carry the homepage's former questions-and-answers header.
  it("reads headers that still carry the former faq header, without it", async () => {
    const stored = { ...headers, faq: defaultHomeHeaders.story };
    const eq = vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { key: "home_headers", published_payload: stored },
        error: null,
      }),
    }));
    const client = { from: () => ({ select: () => ({ eq }) }) } as never;
    expect(await getPublishedHomeHeaders(client)).toEqual(headers);
  });

  it("saves the draft and publishes under the home_headers key", async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: { draft_payload: headers }, error: null });
    const eq = vi.fn(() => ({ select: () => ({ single }) }));
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { from: () => ({ update: () => ({ eq }) }), rpc } as never;

    expect(await updateHomeHeadersDraft(client, headers)).toEqual(headers);
    await publishHomeHeaders(client);
    expect(eq).toHaveBeenCalledWith("key", "home_headers");
    expect(rpc).toHaveBeenCalledWith("publish_site_content", {
      p_key: "home_headers",
    });
  });
});
