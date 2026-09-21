import {
  groupPublicRoomsByLocation,
  roomAvailabilityExceptionCreateSchema,
  roomCapacitySchema,
  roomCreateSchema,
  roomOpeningHoursIntervalSchema,
  roomSlugSchema,
  type PublicRoom,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { calculateRoomAvailabilityForDate, roomMappers } from "./rooms";

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

  it("rejects reversed opening hours and invalid exception time shapes", () => {
    expect(
      roomOpeningHoursIntervalSchema.safeParse({
        weekday: 1,
        startsAt: "18:00",
        endsAt: "08:00",
      }).success,
    ).toBe(false);
    expect(
      roomAvailabilityExceptionCreateSchema.safeParse({
        roomId: "20000000-0000-4000-8000-000000000001",
        date: "2026-12-24",
        type: "blocked_interval",
        startsAt: "12:00",
        endsAt: "10:00",
        reason: null,
      }).success,
    ).toBe(false);
  });
});

describe("effective room availability", () => {
  const openingHours = [{ weekday: 1, startsAt: "08:00", endsAt: "18:00" }];

  it("subtracts blocked intervals and merges extra availability", () => {
    expect(
      calculateRoomAvailabilityForDate({
        roomActive: true,
        weekday: 1,
        openingHours,
        exceptions: [
          {
            type: "blocked_interval",
            startsAt: "12:00",
            endsAt: "14:00",
          },
          {
            type: "extra_available_interval",
            startsAt: "18:00",
            endsAt: "20:00",
          },
        ],
      }),
    ).toEqual([
      { startsAt: "08:00", endsAt: "12:00" },
      { startsAt: "14:00", endsAt: "20:00" },
    ]);
  });

  it("lets an all-day closure override the recurring schedule", () => {
    expect(
      calculateRoomAvailabilityForDate({
        roomActive: true,
        weekday: 1,
        openingHours,
        exceptions: [{ type: "closed_all_day", startsAt: null, endsAt: null }],
      }),
    ).toEqual([]);
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

  it("maps an admin room summary with the joined location context", () => {
    expect(
      roomMappers.adminRoomSummary({
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
      }),
    ).toMatchObject({
      locationName: "Centrum Główne",
      locationSlug: "centrum-glowne",
    });
  });

  it("maps a public room profile with its bridged location context, excluding non-public-safe fields", () => {
    const result = roomMappers.publicRoom(
      {
        room_id: "room-id",
        display_name: "Gabinet Zielony",
        short_description: "Przytulny gabinet.",
        long_description: null,
        image_path: null,
        accessibility_notes: "Wejście od frontu.",
        amenities: ["winda"],
        published: true,
        created_at: "2026-09-20T00:00:00Z",
        updated_at: "2026-09-20T00:00:00Z",
      },
      {
        room_id: "room-id",
        room_slug: "gabinet-zielony",
        location_id: "location-id",
        location_name: "Siedziba Główna",
        location_slug: "siedziba-glowna",
      },
    );

    expect(result).toEqual<PublicRoom>({
      roomId: "room-id",
      roomSlug: "gabinet-zielony",
      displayName: "Gabinet Zielony",
      shortDescription: "Przytulny gabinet.",
      longDescription: null,
      imagePath: null,
      accessibilityNotes: "Wejście od frontu.",
      amenities: ["winda"],
      locationId: "location-id",
      locationName: "Siedziba Główna",
      locationSlug: "siedziba-glowna",
    });
    // Not present anywhere in the input or output: capacity, active,
    // publicly_visible, internal room name -- none of those are
    // public-safe under the current domain (room_slug is, via the
    // narrow bridge function).
    expect(result).not.toHaveProperty("capacity");
  });
});

describe("public room location grouping", () => {
  const room = (
    overrides: Partial<PublicRoom> & Pick<PublicRoom, "roomId">,
  ): PublicRoom => ({
    roomSlug: "gabinet",
    displayName: "Gabinet",
    shortDescription: null,
    longDescription: null,
    imagePath: null,
    accessibilityNotes: null,
    amenities: [],
    locationId: "location-a",
    locationName: "Lokalizacja A",
    locationSlug: "lokalizacja-a",
    ...overrides,
  });

  it("groups rooms under their shared location, preserving input order", () => {
    const rooms = [
      room({ roomId: "room-1", displayName: "Gabinet 1" }),
      room({ roomId: "room-2", displayName: "Gabinet 2" }),
      room({
        roomId: "room-3",
        displayName: "Gabinet 3",
        locationId: "location-b",
        locationName: "Lokalizacja B",
        locationSlug: "lokalizacja-b",
      }),
    ];

    const groups = groupPublicRoomsByLocation(rooms);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      locationId: "location-a",
      locationName: "Lokalizacja A",
    });
    expect(groups[0]!.rooms.map((r) => r.roomId)).toEqual(["room-1", "room-2"]);
    expect(groups[1]).toMatchObject({
      locationId: "location-b",
      locationName: "Lokalizacja B",
    });
    expect(groups[1]!.rooms.map((r) => r.roomId)).toEqual(["room-3"]);
  });

  it("returns an empty array for zero public rooms, inventing nothing", () => {
    expect(groupPublicRoomsByLocation([])).toEqual([]);
  });
});
