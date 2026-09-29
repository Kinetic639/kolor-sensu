import {
  emptyRichTextDocument,
  type RichTextDocument,
  type RoomPublicProfile,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  roomDetailsFormSchema,
  roomProfileFormSchema,
  toRoomDetailsFormValues,
  toRoomProfileFormValues,
  toRoomProfileInput,
  newRoomFormSchema,
  toRoomCreate,
  toRoomUpdate,
} from "./forms";

const profile: RoomPublicProfile = {
  roomId: "room-1",
  displayName: "Gabinet Zielony",
  shortDescription: "Jasny gabinet",
  longDescription: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Pełny opis" }] },
    ],
  } as RichTextDocument,
  imagePath: "rooms/green.jpg",
  accessibilityNotes: "Próg przy wejściu",
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
      longDescription: emptyRichTextDocument,
      published: false,
    });
  });

  it("keeps fields the form no longer edits (image, amenities, access)", () => {
    const values = toRoomProfileFormValues(profile, "Sala 1");
    expect(toRoomProfileInput(values, profile)).toEqual({
      displayName: "Gabinet Zielony",
      shortDescription: "Jasny gabinet",
      longDescription: profile.longDescription,
      accessibilityNotes: "Próg przy wejściu",
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
    color: "#16a34a",
    createdAt: "",
    updatedAt: "",
  };

  it("round-trips a room, storing an empty note as null", () => {
    const values = toRoomDetailsFormValues(room);
    expect(values).toEqual({
      name: "Gabinet Zielony",
      locationId: "location-1",
      description: "",
      capacity: "2",
      active: true,
      color: "#16a34a",
    });
    // Visibility on the site is set with the public profile, not here.
    expect(toRoomUpdate(values)).toEqual({
      name: "Gabinet Zielony",
      locationId: "location-1",
      description: null,
      capacity: 2,
      active: true,
      color: "#16a34a",
    });
  });

  it("keeps the automatic colour as null and refuses a wrong code", () => {
    expect(
      toRoomUpdate({ ...toRoomDetailsFormValues(room), color: null }).color,
    ).toBeNull();
    expect(
      roomDetailsFormSchema.safeParse({
        ...toRoomDetailsFormValues(room),
        color: "zielony",
      }).success,
    ).toBe(false);
  });

  it("explains a missing name and an impossible capacity", () => {
    const result = roomDetailsFormSchema.safeParse({
      ...toRoomDetailsFormValues(room),
      name: " ",
      locationId: "",
      capacity: "0",
    });
    expect(
      Object.fromEntries(
        result.error!.issues.map((issue) => [issue.path[0], issue.message]),
      ),
    ).toEqual({
      name: "Podaj nazwę gabinetu.",
      locationId: "Wybierz lokalizację.",
      capacity: "Pojemność to liczba od 1 do 100.",
    });
  });
});

describe("new room form", () => {
  it("creates an inactive-on-the-site room with a slug from its name", () => {
    expect(
      toRoomCreate({
        name: " Gabinet Żółty ",
        locationId: "30000000-0000-4000-8000-000000000001",
        capacity: "3",
      }),
    ).toEqual({
      name: "Gabinet Żółty",
      slug: "gabinet-zolty",
      locationId: "30000000-0000-4000-8000-000000000001",
      capacity: 3,
      description: null,
      active: true,
      publiclyVisible: false,
      sortOrder: 0,
      // A new room takes the automatic colour.
      color: null,
    });
  });

  it("needs a name that makes an address, and a location", () => {
    const result = newRoomFormSchema.safeParse({
      name: "!",
      locationId: "",
      capacity: "1",
    });
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      "name",
      "locationId",
    ]);
  });
});
