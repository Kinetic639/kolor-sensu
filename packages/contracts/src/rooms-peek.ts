/**
 * Home → "Zajrzyj do środka": the photos of the rooms published on the
 * site (as Gabinety shows them), at most this many. The site builds the
 * row (apps/web/src/lib/rooms-peek.ts); the admin's CMS says how many
 * photos it will show. Both use this rule, so they cannot disagree.
 */
export const ROOMS_PEEK_PHOTOS_MAX = 12;

/**
 * How many photos the section shows, given each published room's photo
 * count. Zero means the site leaves the section out.
 */
export function roomsPeekPhotoCount(photosPerRoom: readonly number[]) {
  const all = photosPerRoom.reduce((sum, count) => sum + Math.max(0, count), 0);
  return Math.min(all, ROOMS_PEEK_PHOTOS_MAX);
}
