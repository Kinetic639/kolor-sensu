import {
  roomCapacitySchema,
  roomCreateSchema,
  roomSlugSchema,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { roomMappers } from "./rooms";

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
});
