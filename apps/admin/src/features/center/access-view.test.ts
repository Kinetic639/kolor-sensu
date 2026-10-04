import { describe, expect, it } from "vitest";
import { accessRows } from "./access-view";

const user = (id: string, isAdmin: boolean, signedInAt: string | null) => ({
  id,
  email: `${id}@example.invalid`,
  firstName: id === "me" ? "Michał" : "Anna",
  lastName: id === "me" ? "Stępień" : `Nowak ${id}`,
  isAdmin,
  isSpecialist: !isAdmin,
  signedInAt,
  invitedAt: "2026-10-01T08:00:00Z",
});

describe("accessRows", () => {
  const rows = accessRows(
    [
      user("spec", false, "2026-10-03T10:00:00Z"),
      user("me", true, "2026-10-05T07:00:00Z"),
      user("new", true, null),
    ],
    "me",
    "Europe/Warsaw",
  );

  it("the admins first, then the specialists", () => {
    expect(rows.map((row) => row.id)).toEqual(["me", "new", "spec"]);
  });

  it("each with their name, roles and when they last came", () => {
    expect(rows[0]).toMatchObject({
      name: "Michał Stępień",
      roles: ["Administrator"],
      seen: "ostatnio 05.10.2026",
      isMe: true,
      canRevoke: false,
    });
    expect(rows[1]).toMatchObject({
      seen: "zaproszenie wysłane 01.10.2026",
      canRevoke: true,
    });
    expect(rows[2]).toMatchObject({
      roles: ["Specjalista"],
      canGrant: true,
      canRevoke: false,
    });
  });
});
