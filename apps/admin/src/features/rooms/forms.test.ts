import type { RoomPublicProfile } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  roomDetailsFormSchema,
  roomProfileFormSchema,
  toRoomDetailsFormValues,
  toRoomProfileFormValues,
  toRoomProfileInput,
  toRoomUpdate,
} from "./forms";

const profile: RoomPublicProfile = {
  roomId: "room-1",
  displayName: "Gabinet Zielony",
  shortDescription: "Jasny gabinet",
  longDescription: null,
  imagePath: "rooms/green.jpg",
  accessibilityNotes: null,
  amenities: ["Fotele"],
  published: true,
  createdAt: "",
  updatedAt: "",
};

describe("room profile form", () => {
  it("starts a new profile from the room's name, unpublished", () => {
    expect(toRoomProfileFormValues(null, "Sala 1")).toEqual({
      displayName: "Sala 1",
      shortDescription: "",
      longDescription: "",
      accessibilityNotes: "",
      amenities: [],
      published: false,
    });
  });

  it("stores empty texts as null and keeps the existing image", () => {
    const values = toRoomProfileFormValues(profile, "Sala 1");
    expect(toRoomProfileInput(values, profile)).toEqual({
      displayName: "Gabinet Zielony",
      shortDescription: "Jasny gabinet",
      longDescription: null,
      accessibilityNotes: null,
      imagePath: "rooms/green.jpg",
      amenities: ["Fotele"],
      published: true,
    });
  });

  it("requires a public name", () => {
    const result = roomProfileFormSchema.safeParse({
      ...toRoomProfileFormValues(null, ""),
    });
    expect(result.error?.issues[0]?.message).toBe(
      "Podaj nazwę widoczną na stronie.",
    );
  });
});

describe("room details form", () => {
  const room = {
    id: "room-1",
    locationId: "location-1",
    name: "Gabinet Zielony",
    slug: "gabinet-zielony",
    description: null,
    active: true,
    publiclyVisible: false,
    capacity: 2,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  };

  it("round-trips a room, storing an empty note as null", () => {
    const values = toRoomDetailsFormValues(room);
    expect(values).toEqual({
      name: "Gabinet Zielony",
      description: "",
      capacity: "2",
      active: true,
      publiclyVisible: false,
    });
    expect(toRoomUpdate(values)).toEqual({
      name: "Gabinet Zielony",
      description: null,
      capacity: 2,
      active: true,
      publiclyVisible: false,
    });
  });

  it("explains a missing name and an impossible capacity", () => {
    const result = roomDetailsFormSchema.safeParse({
      ...toRoomDetailsFormValues(room),
      name: " ",
      capacity: "0",
    });
    expect(
      Object.fromEntries(
        result.error!.issues.map((issue) => [issue.path[0], issue.message]),
      ),
    ).toEqual({
      name: "Podaj nazwę gabinetu.",
      capacity: "Pojemność to liczba od 1 do 100.",
    });
  });
});
