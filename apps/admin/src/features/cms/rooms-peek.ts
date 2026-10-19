import {
  ROOMS_PEEK_PHOTOS_MAX,
  roomsPeekPhotoCount,
} from "@repo/contracts/rooms-peek";

// Home → "Zajrzyj do środka": the section has no settings of its own but
// its header; its photos are the published rooms' (Gabinety → a room →
// Profil). The CMS says how many the site shows now, with the site's own
// rule (@repo/contracts/rooms-peek), and, with none, that the section is
// hidden and why.

export interface RoomsPeekModel {
  /** Rooms on the site (active, public, profile published, in a public location). */
  publishedRooms: number;
  /** Of them, the ones with at least one photo. */
  roomsWithPhotos: number;
  /** What the section shows; 0: the site leaves it out. */
  photos: number;
}

/** From each published room's photo count. */
export function mapRoomsPeekModel(
  photosPerRoom: readonly number[],
): RoomsPeekModel {
  return {
    publishedRooms: photosPerRoom.length,
    roomsWithPhotos: photosPerRoom.filter((count) => count > 0).length,
    photos: roomsPeekPhotoCount(photosPerRoom),
  };
}

/** 1 zdjęcie, 2–4 zdjęcia, 5 zdjęć (12–14 too), 22 zdjęcia… */
function plural(count: number, one: string, few: string, many: string) {
  if (count === 1) return one;
  const tens = count % 100;
  const units = count % 10;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

const photosLabel = (count: number) =>
  `${count} ${plural(count, "zdjęcie", "zdjęcia", "zdjęć")}`;
const roomsLabel = (count: number) =>
  `${count} ${plural(count, "gabinetu", "gabinetów", "gabinetów")}`;

/** The section's line in the CMS: shown or hidden, in short. */
export function roomsPeekNote(model: RoomsPeekModel) {
  return model.photos > 0
    ? `${photosLabel(model.photos)} z Gabinetów`
    : "ukryta na stronie: brak zdjęć gabinetów";
}

/** What the section shows now, or why the site leaves it out. */
export function roomsPeekStatus(model: RoomsPeekModel) {
  if (model.photos > 0) {
    return `Na stronie: ${photosLabel(model.photos)} z ${roomsLabel(
      model.roomsWithPhotos,
    )}.`;
  }
  return model.publishedRooms === 0
    ? "Tej sekcji nie ma teraz na stronie: żaden gabinet nie jest opublikowany. Opublikuj gabinet i dodaj mu zdjęcia, a sekcja się pojawi."
    : "Tej sekcji nie ma teraz na stronie: opublikowane gabinety nie mają zdjęć. Dodaj zdjęcia gabinetu, a sekcja się pojawi.";
}

/** Where the photos come from (shown in every case). */
export const roomsPeekSource = `Zdjęcia pochodzą z gabinetów opublikowanych na stronie (najpierw główne zdjęcie każdego gabinetu), najwyżej ${ROOMS_PEEK_PHOTOS_MAX}. Dodajesz je i zmieniasz w Gabinety, w zakładce Profil publiczny wybranego gabinetu.`;
