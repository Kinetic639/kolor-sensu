import { z } from "zod";

export const roomSlugSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL safe.");

export const roomCapacitySchema = z.number().int().min(1).max(100);

export const roomCreateSchema = z.object({
  locationId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  slug: roomSlugSchema,
  description: z.string().trim().max(2000).nullable().default(null),
  active: z.boolean().default(true),
  publiclyVisible: z.boolean().default(false),
  capacity: roomCapacitySchema.default(1),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export const roomUpdateSchema = roomCreateSchema.partial();

export const roomPublicProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  shortDescription: z.string().trim().max(500).nullable().default(null),
  longDescription: z.string().trim().max(10_000).nullable().default(null),
  imagePath: z.string().trim().max(2048).nullable().default(null),
  accessibilityNotes: z.string().trim().max(2000).nullable().default(null),
  amenities: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  published: z.boolean().default(false),
});

export const roomTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, "Use time as HH:mm.");

export const roomOpeningHoursIntervalSchema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    startsAt: roomTimeSchema,
    endsAt: roomTimeSchema,
  })
  .refine((value) => value.startsAt < value.endsAt, {
    message: "Start time must be before end time.",
    path: ["endsAt"],
  });

export const roomOpeningHoursReplaceSchema = z.object({
  roomId: z.uuid(),
  intervals: z.array(roomOpeningHoursIntervalSchema).max(70),
});

const roomExceptionBaseSchema = z.object({
  roomId: z.uuid(),
  date: z.iso.date(),
  reason: z.string().trim().max(500).nullable().default(null),
});

const roomTimedExceptionSchema = roomExceptionBaseSchema.extend({
  type: z.enum(["blocked_interval", "extra_available_interval"]),
  startsAt: roomTimeSchema,
  endsAt: roomTimeSchema,
});

export const roomAvailabilityExceptionCreateSchema = z
  .discriminatedUnion("type", [
    roomExceptionBaseSchema.extend({
      type: z.literal("closed_all_day"),
      startsAt: z.null().default(null),
      endsAt: z.null().default(null),
    }),
    roomTimedExceptionSchema,
  ])
  .refine(
    (value) => value.type === "closed_all_day" || value.startsAt < value.endsAt,
    { message: "Start time must be before end time.", path: ["endsAt"] },
  );

export const roomAvailabilityExceptionUpdateSchema =
  roomAvailabilityExceptionCreateSchema;

export type RoomCreate = z.infer<typeof roomCreateSchema>;
export type RoomUpdate = z.infer<typeof roomUpdateSchema>;
export type RoomPublicProfileInput = z.infer<typeof roomPublicProfileSchema>;
export type RoomOpeningHoursIntervalInput = z.infer<
  typeof roomOpeningHoursIntervalSchema
>;
export type RoomOpeningHoursReplace = z.infer<
  typeof roomOpeningHoursReplaceSchema
>;
export type RoomAvailabilityExceptionCreate = z.infer<
  typeof roomAvailabilityExceptionCreateSchema
>;
export type RoomAvailabilityExceptionUpdate = z.infer<
  typeof roomAvailabilityExceptionUpdateSchema
>;

export interface Room {
  id: string;
  locationId: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  publiclyVisible: boolean;
  capacity: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRoomSummary extends Room {
  locationName: string;
  locationSlug: string;
  publicProfilePublished: boolean;
  hasOpeningHours: boolean;
  upcomingExceptionCount: number;
}

export interface AdminRoomDetail extends Room {
  locationName: string;
  locationSlug: string;
}

export interface RoomPublicProfile extends RoomPublicProfileInput {
  roomId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomOpeningHoursInterval extends RoomOpeningHoursIntervalInput {
  id: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
}

export type RoomAvailabilityExceptionType =
  "closed_all_day" | "blocked_interval" | "extra_available_interval";

export interface RoomAvailabilityException {
  id: string;
  roomId: string;
  date: string;
  type: RoomAvailabilityExceptionType;
  startsAt: string | null;
  endsAt: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EffectiveRoomAvailabilityInput {
  roomActive: boolean;
  weekday: number;
  openingHours: RoomOpeningHoursIntervalInput[];
  exceptions: Pick<RoomAvailabilityException, "type" | "startsAt" | "endsAt">[];
}

export interface RoomTimeInterval {
  startsAt: string;
  endsAt: string;
}

/**
 * The public-safe projection of a room: only fields a published room
 * public profile actually carries, plus the location context resolved
 * through the narrow `list_public_room_locations()` bridge (anon has no
 * direct grant on `rooms` at all). Deliberately excludes capacity,
 * internal descriptions, and anything from opening hours or availability
 * exceptions -- none of those are public-safe under the current domain.
 */
export interface PublicRoom {
  roomId: string;
  roomSlug: string;
  displayName: string;
  shortDescription: string | null;
  longDescription: string | null;
  imagePath: string | null;
  accessibilityNotes: string | null;
  amenities: string[];
  locationId: string;
  locationName: string;
  locationSlug: string;
}

export interface PublicRoomLocationGroup {
  locationId: string;
  locationName: string;
  locationSlug: string;
  rooms: PublicRoom[];
}

/**
 * Groups already-location-resolved public rooms by their location,
 * preserving input order within and across groups (a Map iterates in
 * insertion order). Callers should pass rooms pre-sorted the way they
 * want groups and rooms-within-a-group to appear -- this function does
 * no sorting of its own.
 */
export function groupPublicRoomsByLocation(
  rooms: PublicRoom[],
): PublicRoomLocationGroup[] {
  const groups = new Map<string, PublicRoomLocationGroup>();
  for (const room of rooms) {
    const existing = groups.get(room.locationId);
    if (existing) {
      existing.rooms.push(room);
    } else {
      groups.set(room.locationId, {
        locationId: room.locationId,
        locationName: room.locationName,
        locationSlug: room.locationSlug,
        rooms: [room],
      });
    }
  }
  return Array.from(groups.values());
}
