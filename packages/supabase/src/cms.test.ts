import {
  defaultRoomsPageContent,
  homePageContentSchema,
  roomsPageContentSchema,
} from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  getPublishedRoomsPageContent,
  publishRoomsPageContent,
  updateRoomsPageDraft,
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
