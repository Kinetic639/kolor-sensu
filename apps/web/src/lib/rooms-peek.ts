import { ROOMS_PEEK_PHOTOS_MAX } from "@repo/contracts/rooms-peek";
import type { RoomsPeekPhoto } from "@repo/ui/public-site";
import type { RoomsPageLocation } from "./rooms-by-location";

/**
 * Home → "Zajrzyj do środka": the rooms' photos, as Gabinety shows them.
 * Every room's main photo comes first, then each room's next one, and so
 * on, so the row shows all the rooms before any one twice. At most
 * ROOMS_PEEK_PHOTOS_MAX (shared with the admin's CMS, which counts them).
 */
export function toRoomsPeekPhotos(
  groups: readonly Pick<RoomsPageLocation, "rooms">[],
): RoomsPeekPhoto[] {
  const rooms = groups.flatMap((group) => group.rooms);
  const deepest = Math.max(0, ...rooms.map((room) => room.photos.length));
  const photos: RoomsPeekPhoto[] = [];
  for (let at = 0; at < deepest; at++) {
    for (const room of rooms) {
      const photo = room.photos[at];
      if (photo) photos.push({ ...photo, room: room.displayName });
    }
  }
  return photos.slice(0, ROOMS_PEEK_PHOTOS_MAX);
}
