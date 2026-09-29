import { hexColorSchema } from "@repo/contracts/colors";
import { partialUpdateSchema } from "@repo/contracts/partial-update";
import {
  emptyRichTextDocument,
  richTextDocumentWithMaxCharacters,
} from "@repo/contracts/rich-text";
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
  /** For schedules and lists; null: automatic (by position). */
  color: hexColorSchema.nullable().default(null),
});

export const roomUpdateSchema = partialUpdateSchema(roomCreateSchema);

export const roomPublicProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  shortDescription: z.string().trim().max(500).nullable().default(null),
  // Rich text (docs/architecture/rich-text-platform.md), 10 000 characters.
  longDescription: richTextDocumentWithMaxCharacters(10_000).default(
    emptyRichTextDocument,
  ),
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
  /** `#rrggbb`, or null for the automatic colour. */
  color: string | null;
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

/** A photo of a room's public profile (at most 5, one of them the main). */
export interface RoomImage {
  id: string;
  roomId: string;
  storagePath: string;
  /** 0-based order in the gallery. */
  position: number;
  isMain: boolean;
  /** Public URL (the room-media bucket is public). */
  url: string;
}

export const ROOM_IMAGE_LIMIT = 5;

/** Where a published room is shown on the site: its location and order. */
export interface RoomPlacement {
  roomId: string;
  locationId: string;
  sortOrder: number;
}
