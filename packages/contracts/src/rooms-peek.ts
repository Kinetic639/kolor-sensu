/**
 * Home → "Zajrzyj do środka": the photos of the rooms published on the
 * site (as Gabinety shows them), at most this many. The site builds the
 * row (apps/web/src/lib/rooms-peek.ts); the admin's CMS says how many
 * photos it will show. Both use this rule, so they cannot disagree.
 */
import { z } from "zod";

export const ROOMS_PEEK_PHOTOS_MAX = 12;

export const homeRoomsGallerySchema = z.strictObject({
  visible: z.boolean(),
  source: z.enum(["auto", "manual"]),
  photos: z
    .array(
      z.strictObject({
        source: z.enum(["room", "upload"]),
        imagePath: z.string().trim().min(1).max(2048),
        imageAlt: z.string().trim().min(1).max(200),
        caption: z.string().trim().min(1).max(100),
        description: z.string().trim().max(200).default(""),
      }),
    )
    .max(ROOMS_PEEK_PHOTOS_MAX),
});
export type HomeRoomsGallery = z.infer<typeof homeRoomsGallerySchema>;
export const defaultHomeRoomsGallery: HomeRoomsGallery = {
  visible: true,
  source: "auto",
  photos: [],
};

/**
 * How many photos the section shows, given each published room's photo
 * count. Zero means the site leaves the section out.
 */
export function roomsPeekPhotoCount(photosPerRoom: readonly number[]) {
  const all = photosPerRoom.reduce((sum, count) => sum + Math.max(0, count), 0);
  return Math.min(all, ROOMS_PEEK_PHOTOS_MAX);
}
