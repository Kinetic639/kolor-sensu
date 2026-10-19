import { describe, expect, it } from "vitest";
import {
  mapRoomsPeekModel,
  roomsPeekNote,
  roomsPeekSource,
  roomsPeekStatus,
} from "./rooms-peek";

describe("mapRoomsPeekModel", () => {
  it("counts the published rooms' photos as the site shows them", () => {
    expect(mapRoomsPeekModel([2, 0, 3])).toEqual({
      publishedRooms: 3,
      roomsWithPhotos: 2,
      photos: 5,
    });
  });

  it("stops at the site's twelve photos", () => {
    expect(mapRoomsPeekModel([5, 5, 5]).photos).toBe(12);
  });
});

describe("roomsPeekNote", () => {
  it("says how many photos the section shows", () => {
    expect(roomsPeekNote(mapRoomsPeekModel([1]))).toBe("1 zdjęcie z Gabinetów");
    expect(roomsPeekNote(mapRoomsPeekModel([3]))).toBe("3 zdjęcia z Gabinetów");
    expect(roomsPeekNote(mapRoomsPeekModel([5, 5, 5]))).toBe(
      "12 zdjęć z Gabinetów",
    );
  });

  it("says plainly that the section is hidden without photos", () => {
    expect(roomsPeekNote(mapRoomsPeekModel([0, 0]))).toBe(
      "ukryta na stronie: brak zdjęć gabinetów",
    );
  });
});

describe("roomsPeekStatus", () => {
  it("names the photos and the rooms they come from", () => {
    expect(roomsPeekStatus(mapRoomsPeekModel([2, 0]))).toBe(
      "Na stronie: 2 zdjęcia z 1 gabinetu.",
    );
    expect(roomsPeekStatus(mapRoomsPeekModel([2, 3]))).toBe(
      "Na stronie: 5 zdjęć z 2 gabinetów.",
    );
  });

  it("explains why the section is hidden", () => {
    expect(roomsPeekStatus(mapRoomsPeekModel([]))).toMatch(
      /nie ma teraz na stronie: żaden gabinet nie jest opublikowany/,
    );
    expect(roomsPeekStatus(mapRoomsPeekModel([0]))).toMatch(
      /nie ma teraz na stronie: opublikowane gabinety nie mają zdjęć/,
    );
  });
});

it("tells where the photos come from and the limit", () => {
  expect(roomsPeekSource).toMatch(/najwyżej 12/);
  expect(roomsPeekSource).toMatch(/Gabinety/);
});
