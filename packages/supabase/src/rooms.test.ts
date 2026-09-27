import {
  roomCapacitySchema,
  roomCreateSchema,
  roomSlugSchema,
} from "@repo/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  buildRoomImagePath,
  listPublishedRoomProfiles,
  listRoomImages,
  removeRoomImage,
  reorderRoomImages,
  roomMappers,
  setRoomMainImage,
  uploadRoomImage,
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

describe("room images", () => {
  const roomId = "30000000-0000-4000-8000-000000000001";
  const imageRow = {
    id: "image-1",
    room_id: roomId,
    storage_path: `${roomId}/abc.webp`,
    position: 0,
    is_main: true,
    created_at: "2026-09-27T00:00:00Z",
    updated_at: "2026-09-27T00:00:00Z",
  };

  function storageClient() {
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const getPublicUrl = vi.fn((path: string) => ({
      data: { publicUrl: `https://cdn/room-media/${path}` },
    }));
    const bucket = vi.fn(() => ({ upload, remove, getPublicUrl }));
    return { upload, remove, getPublicUrl, bucket };
  }

  it("keeps each room's photos in its own folder", () => {
    expect(buildRoomImagePath(roomId, "image/webp", "abc")).toBe(
      `${roomId}/abc.webp`,
    );
  });

  it("uploads a photo and registers it on the room", async () => {
    const storage = storageClient();
    const rpc = vi.fn().mockResolvedValue({ data: "image-1", error: null });
    const client = { storage: { from: storage.bucket }, rpc } as never;
    const file = new File(["x"], "room.webp", { type: "image/webp" });

    const id = await uploadRoomImage(client, roomId, file);

    expect(storage.bucket).toHaveBeenCalledWith("room-media");
    const [path] = storage.upload.mock.calls[0]!;
    expect(path).toMatch(new RegExp(`^${roomId}/[0-9a-f-]+\.webp$`));
    expect(rpc).toHaveBeenCalledWith("add_room_image", {
      p_room_id: roomId,
      p_storage_path: path,
    });
    expect(id).toBe("image-1");
  });

  it("removes the uploaded file when the room already has 5 photos", async () => {
    const storage = storageClient();
    const limit = {
      code: "23514",
      message: "A room can have at most 5 photos",
    };
    const rpc = vi.fn().mockResolvedValue({ data: null, error: limit });
    const client = { storage: { from: storage.bucket }, rpc } as never;
    const file = new File(["x"], "room.webp", { type: "image/webp" });

    await expect(uploadRoomImage(client, roomId, file)).rejects.toBe(limit);
    const [path] = storage.upload.mock.calls[0]!;
    expect(storage.remove).toHaveBeenCalledWith([path]);
  });

  it("refuses files that are not photos before uploading", async () => {
    const storage = storageClient();
    const client = { storage: { from: storage.bucket }, rpc: vi.fn() } as never;
    await expect(
      uploadRoomImage(
        client,
        roomId,
        new File(["x"], "a.gif", { type: "image/gif" }),
      ),
    ).rejects.toThrow(/JPG, PNG lub WebP/);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("lists a room's photos in order with their public URLs", async () => {
    const storage = storageClient();
    const chain = queryResult(imageRow);
    const client = {
      from: vi.fn(() => chain),
      storage: { from: storage.bucket },
    } as never;

    const images = await listRoomImages(client, roomId);

    expect(chain.eq).toHaveBeenCalledWith("room_id", roomId);
    expect(chain.order).toHaveBeenCalledWith("position");
    expect(images).toEqual([
      {
        id: "image-1",
        roomId,
        storagePath: `${roomId}/abc.webp`,
        position: 0,
        isMain: true,
        url: `https://cdn/room-media/${roomId}/abc.webp`,
      },
    ]);
  });

  it("deletes the file of a removed photo", async () => {
    const storage = storageClient();
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: `${roomId}/abc.webp`, error: null });
    const client = { storage: { from: storage.bucket }, rpc } as never;

    await removeRoomImage(client, "image-1");

    expect(rpc).toHaveBeenCalledWith("remove_room_image", {
      p_image_id: "image-1",
    });
    expect(storage.remove).toHaveBeenCalledWith([`${roomId}/abc.webp`]);
  });

  it("saves a new order and the main photo", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = { rpc } as never;

    await reorderRoomImages(client, roomId, ["b", "a"]);
    await setRoomMainImage(client, "b");

    expect(rpc).toHaveBeenNthCalledWith(1, "reorder_room_images", {
      p_room_id: roomId,
      p_image_ids: ["b", "a"],
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "set_room_main_image", {
      p_image_id: "b",
    });
  });
});
