import {
  roomCapacitySchema,
  roomCreateSchema,
  roomSlugSchema,
} from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  listPublishedRoomProfiles,
  roomMappers,
  upsertRoomPublicProfile,
} from "./rooms";

describe("room domain schemas", () => {
  it("accepts stable URL-safe room slugs and rejects unsafe values", () => {
    expect(roomSlugSchema.safeParse("sala-1").success).toBe(true);
    expect(roomSlugSchema.safeParse("Sala 1").success).toBe(false);
  });

  it("keeps capacity within the sane 1-100 range", () => {
    expect(roomCapacitySchema.safeParse(4).success).toBe(true);
    expect(roomCapacitySchema.safeParse(0).success).toBe(false);
    expect(roomCapacitySchema.safeParse(101).success).toBe(false);
  });

  it("applies room defaults for optional fields, keeping public exposure opt-in", () => {
    const result = roomCreateSchema.parse({
      locationId: "20000000-0000-4000-8000-000000000001",
      name: "Sala 1",
      slug: "sala-1",
    });
    expect(result.active).toBe(true);
    expect(result.publiclyVisible).toBe(false);
    expect(result.capacity).toBe(1);
  });
});

describe("room domain mapping", () => {
  it("maps room database naming into client-agnostic domain naming", () => {
    expect(
      roomMappers.room({
        id: "room-id",
        location_id: "location-id",
        name: "Sala 1",
        slug: "sala-1",
        description: null,
        active: true,
        publicly_visible: false,
        capacity: 4,
        sort_order: 0,
        created_at: "2026-09-20T00:00:00Z",
        updated_at: "2026-09-20T00:00:00Z",
      }),
    ).toMatchObject({
      id: "room-id",
      locationId: "location-id",
      slug: "sala-1",
      capacity: 4,
    });
  });

  const summaryRow = {
    id: "room-id",
    location_id: "location-id",
    name: "Sala 1",
    slug: "sala-1",
    description: null,
    active: true,
    publicly_visible: false,
    capacity: 4,
    sort_order: 0,
    created_at: "2026-09-20T00:00:00Z",
    updated_at: "2026-09-20T00:00:00Z",
    locations: { name: "Centrum Główne", slug: "centrum-glowne" },
    room_public_profiles: { published: true },
    room_opening_hours: [{ id: "hours-1" }, { id: "hours-2" }],
    room_availability_exceptions: [{ id: "exception-1" }],
  };

  it("maps an admin room summary with the joined location context", () => {
    expect(roomMappers.adminRoomSummary(summaryRow)).toMatchObject({
      locationName: "Centrum Główne",
      locationSlug: "centrum-glowne",
    });
  });

  it("summarises the room's public profile, opening hours and upcoming exceptions", () => {
    expect(roomMappers.adminRoomSummary(summaryRow)).toMatchObject({
      publicProfilePublished: true,
      hasOpeningHours: true,
      upcomingExceptionCount: 1,
    });
    // A new room: no profile, no hours, no exceptions.
    expect(
      roomMappers.adminRoomSummary({
        ...summaryRow,
        room_public_profiles: null,
        room_opening_hours: [],
        room_availability_exceptions: [],
      }),
    ).toMatchObject({
      publicProfilePublished: false,
      hasOpeningHours: false,
      upcomingExceptionCount: 0,
    });
  });
});

const profileRow = {
  room_id: "room-1",
  display_name: "Gabinet Zielony",
  short_description: "Jasny gabinet",
  long_description: null,
  image_path: null,
  accessibility_notes: "Winda w budynku",
  amenities: ["Fotele", "Klimatyzacja"],
  published: true,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-02T00:00:00Z",
};

function queryResult(data: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "upsert"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  chain.single = vi.fn().mockResolvedValue({ data, error: null });
  chain.then = (resolve: (value: unknown) => void) =>
    resolve({ data: [data], error: null });
  return chain;
}

describe("room public profiles", () => {
  it("maps database naming into the contract", () => {
    expect(roomMappers.publicProfile(profileRow)).toEqual({
      roomId: "room-1",
      displayName: "Gabinet Zielony",
      shortDescription: "Jasny gabinet",
      longDescription: null,
      imagePath: null,
      accessibilityNotes: "Winda w budynku",
      amenities: ["Fotele", "Klimatyzacja"],
      published: true,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-02T00:00:00Z",
    });
  });

  it("saves a validated profile keyed by the room", async () => {
    const chain = queryResult(profileRow);
    const client = { from: vi.fn(() => chain) } as never;

    const saved = await upsertRoomPublicProfile(client, "room-1", {
      displayName: " Gabinet Zielony ",
      amenities: ["Fotele"],
      published: true,
    });

    expect(chain.upsert).toHaveBeenCalledWith(
      {
        room_id: "room-1",
        display_name: "Gabinet Zielony",
        short_description: null,
        long_description: null,
        image_path: null,
        accessibility_notes: null,
        amenities: ["Fotele"],
        published: true,
      },
      { onConflict: "room_id" },
    );
    expect(saved.displayName).toBe("Gabinet Zielony");
  });

  it("rejects a profile without a name before writing", async () => {
    const from = vi.fn();
    await expect(
      upsertRoomPublicProfile({ from } as never, "room-1", {
        displayName: "",
      }),
    ).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });

  it("lists only published profiles for the site", async () => {
    const chain = queryResult(profileRow);
    const client = { from: vi.fn(() => chain) } as never;

    const profiles = await listPublishedRoomProfiles(client);

    expect(chain.eq).toHaveBeenCalledWith("published", true);
    expect(profiles.map((profile) => profile.displayName)).toEqual([
      "Gabinet Zielony",
    ]);
  });
});
