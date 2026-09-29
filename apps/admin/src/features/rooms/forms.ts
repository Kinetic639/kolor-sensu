import {
  emptyRichTextDocument,
  hexColorSchema,
  richTextDocumentWithMaxCharacters,
  type Room,
  type RoomCreate,
  type RoomPublicProfile,
  type RoomPublicProfileInput,
  type RoomUpdate,
} from "@repo/contracts";
import { slugify } from "@/lib/slugify";
import { z } from "zod";

export const roomProfileFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Podaj nazwę widoczną na stronie.")
    .max(200),
  shortDescription: z.string().trim().max(500),
  // Rich text, like a specialist's bio. Amenities and accessibility now
  // belong to the location (the building), not the room.
  longDescription: richTextDocumentWithMaxCharacters(10_000),
});

export type RoomProfileFormValues = z.infer<typeof roomProfileFormSchema>;

export function toRoomProfileFormValues(
  profile: RoomPublicProfile | null,
  roomName: string,
): RoomProfileFormValues {
  return {
    displayName: profile?.displayName ?? roomName,
    shortDescription: profile?.shortDescription ?? "",
    longDescription: profile?.longDescription ?? emptyRichTextDocument,
  };
}

const nullIfEmpty = (value: string) => value.trim() || null;

/**
 * Fields this form no longer edits (the legacy image path, room amenities and
 * accessibility notes) keep their stored values; whether it is published is
 * set in the room's settings (see roomProfileForVisibility).
 */
export function toRoomProfileInput(
  values: RoomProfileFormValues,
  current: RoomPublicProfile | null,
): RoomPublicProfileInput {
  return {
    displayName: values.displayName.trim(),
    shortDescription: nullIfEmpty(values.shortDescription),
    longDescription: values.longDescription,
    accessibilityNotes: current?.accessibilityNotes ?? null,
    imagePath: current?.imagePath ?? null,
    amenities: current?.amenities ?? [],
    published: current?.published ?? false,
  };
}

const capacityField = z.string().refine((value) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 100;
}, "Pojemność to liczba od 1 do 100.");
const locationField = z.string().min(1, "Wybierz lokalizację.");

/**
 * The profile to save so the room is shown on the site or hidden: the
 * current one with its flag changed, a new one from the room's name when
 * shown for the first time, or none (nothing to hide).
 */
export function roomProfileForVisibility(
  current: RoomPublicProfile | null,
  roomName: string,
  onSite: boolean,
): RoomPublicProfileInput | null {
  if (current) {
    return {
      displayName: current.displayName,
      shortDescription: current.shortDescription,
      longDescription: current.longDescription,
      accessibilityNotes: current.accessibilityNotes,
      imagePath: current.imagePath,
      amenities: current.amenities,
      published: onSite,
    };
  }
  if (!onSite) return null;
  return {
    displayName: roomName,
    shortDescription: null,
    longDescription: emptyRichTextDocument,
    accessibilityNotes: null,
    imagePath: null,
    amenities: [],
    published: true,
  };
}

// Whether the room is shown on the site is set here, with its profile's
// flag (roomProfileForVisibility).
export const roomDetailsFormSchema = z.object({
  name: z.string().trim().min(1, "Podaj nazwę gabinetu.").max(200),
  locationId: locationField,
  description: z.string().trim().max(2000),
  capacity: capacityField,
  active: z.boolean(),
  /** On the site: the room is public and its profile published. */
  onSite: z.boolean(),
  /** For schedules and lists; null: automatic. */
  color: hexColorSchema.nullable(),
});

export type RoomDetailsFormValues = z.infer<typeof roomDetailsFormSchema>;

export function toRoomDetailsFormValues(
  room: Room,
  onSite: boolean,
): RoomDetailsFormValues {
  return {
    name: room.name,
    locationId: room.locationId,
    description: room.description ?? "",
    capacity: String(room.capacity),
    active: room.active,
    onSite,
    color: room.color,
  };
}

export function toRoomUpdate(values: RoomDetailsFormValues): RoomUpdate {
  return {
    name: values.name.trim(),
    locationId: values.locationId,
    description: nullIfEmpty(values.description),
    capacity: Number(values.capacity),
    active: values.active,
    publiclyVisible: values.onSite,
    color: values.color,
  };
}

export const newRoomFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Podaj nazwę gabinetu.")
    .max(200)
    .refine(
      (name) => slugify(name).length >= 3,
      "Nazwa musi zawierać co najmniej 3 litery lub cyfry.",
    ),
  locationId: locationField,
  capacity: capacityField,
});

export type NewRoomFormValues = z.infer<typeof newRoomFormSchema>;

/** A new room starts active but hidden from the site until published. */
export function toRoomCreate(values: NewRoomFormValues): RoomCreate {
  return {
    name: values.name.trim(),
    slug: slugify(values.name),
    locationId: values.locationId,
    capacity: Number(values.capacity),
    description: null,
    active: true,
    publiclyVisible: false,
    sortOrder: 0,
    color: null,
  };
}
