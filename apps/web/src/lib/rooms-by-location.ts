import type {
  PublicLocation,
  RoomImage,
  RoomPlacement,
  RoomPublicProfile,
} from "@repo/contracts";

export interface RoomsPageRoom extends RoomPublicProfile {
  /** The main photo first, then the others in the admin's order. */
  photos: Array<{ url: string; alt: string; caption?: string }>;
}

export interface RoomsPageLocation {
  location: PublicLocation;
  rooms: RoomsPageRoom[];
}

/**
 * The /gabinety page's structure: each location (the building) with its
 * published rooms. Locations without rooms are left out.
 */
export function groupRoomsByLocation({
  locations,
  placements,
  profiles,
  images,
}: {
  locations: PublicLocation[];
  placements: RoomPlacement[];
  profiles: RoomPublicProfile[];
  images: RoomImage[];
}): RoomsPageLocation[] {
  const profileByRoom = new Map(
    profiles.map((profile) => [profile.roomId, profile]),
  );

  const photosOf = (profile: RoomPublicProfile) => {
    const own = images
      .filter((image) => image.roomId === profile.roomId)
      .sort(
        (a, b) =>
          Number(b.isMain) - Number(a.isMain) || a.position - b.position,
      );
    return own.map((image, index) => ({
      url: image.url,
      caption: image.caption ?? "",
      alt: `${profile.displayName}, zdjęcie ${index + 1} z ${own.length}`,
    }));
  };

  return [...locations]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((location) => ({
      location,
      rooms: placements
        .filter((placement) => placement.locationId === location.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .flatMap((placement) => {
          const profile = profileByRoom.get(placement.roomId);
          return profile ? [{ ...profile, photos: photosOf(profile) }] : [];
        }),
    }))
    .filter((group) => group.rooms.length > 0);
}
