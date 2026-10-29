import { ROOM_IMAGE_LIMIT } from "@repo/contracts";
import {
  defaultHomeRoomsGallery,
  type HomeRoomsGallery,
} from "@repo/contracts/rooms-peek";
import type { RoomsPeekPhoto } from "@repo/ui/public-site";
import type { RoomsPageLocation } from "./rooms-by-location";

/** Published room profiles are the single source of banner photos and captions.
 * Keep each room together, main photo first; never let another room's photos
 * exhaust its allowance. CMS controls only the banner's visibility and header.
 */
export function toRoomsPeekPhotos(
  groups: readonly Pick<RoomsPageLocation, "rooms">[],
  settings: Pick<HomeRoomsGallery, "visible"> = defaultHomeRoomsGallery,
): RoomsPeekPhoto[] {
  if (!settings.visible) return [];
  return groups.flatMap((group) =>
    group.rooms.flatMap((room) =>
      room.photos.slice(0, ROOM_IMAGE_LIMIT).map((photo) => ({
        ...photo,
        roomId: room.roomId,
        room: room.displayName,
        description: photo.caption || undefined,
      })),
    ),
  );
}
