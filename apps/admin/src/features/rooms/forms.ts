import type {
  RoomPublicProfile,
  RoomPublicProfileInput,
} from "@repo/contracts";
import { z } from "zod";

export const roomProfileFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Podaj nazwę widoczną na stronie.")
    .max(200),
  shortDescription: z.string().trim().max(500),
  longDescription: z.string().trim().max(10_000),
  accessibilityNotes: z.string().trim().max(2000),
  amenities: z.array(z.string().trim().min(1).max(100)).max(50),
  published: z.boolean(),
});

export type RoomProfileFormValues = z.infer<typeof roomProfileFormSchema>;

export function toRoomProfileFormValues(
  profile: RoomPublicProfile | null,
  roomName: string,
): RoomProfileFormValues {
  return {
    displayName: profile?.displayName ?? roomName,
    shortDescription: profile?.shortDescription ?? "",
    longDescription: profile?.longDescription ?? "",
    accessibilityNotes: profile?.accessibilityNotes ?? "",
    amenities: profile?.amenities ?? [],
    published: profile?.published ?? false,
  };
}

const nullIfEmpty = (value: string) => value.trim() || null;

/** The photo is not edited here yet, so an existing one is kept. */
export function toRoomProfileInput(
  values: RoomProfileFormValues,
  current: RoomPublicProfile | null,
): RoomPublicProfileInput {
  return {
    displayName: values.displayName.trim(),
    shortDescription: nullIfEmpty(values.shortDescription),
    longDescription: nullIfEmpty(values.longDescription),
    accessibilityNotes: nullIfEmpty(values.accessibilityNotes),
    imagePath: current?.imagePath ?? null,
    amenities: values.amenities,
    published: values.published,
  };
}
