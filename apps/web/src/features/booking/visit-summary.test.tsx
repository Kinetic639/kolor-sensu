import type { GuestBooking } from "@repo/supabase";
import { describe, expect, it } from "vitest";
import { ONLINE_LINK_NOTE } from "./visit-label";
import { visitSummaryItems } from "./visit-summary";

// The visit's pages: an online visit says how its link comes (#177).

const booking = {
  serviceName: "Konsultacja",
  priceMinor: 20000,
  currencyCode: "PLN",
  specialistName: "Anna Nowak",
  startsAt: "2030-10-02T09:00:00Z",
  endsAt: "2030-10-02T09:50:00Z",
  mode: "in_person",
  locationName: "Poznań",
  roomName: "Gabinet 1",
} as GuestBooking;

const place = (visit: GuestBooking) =>
  visitSummaryItems(visit, "Europe/Warsaw").find(
    (item) => item.key === "forma",
  );

describe("a visit's summary", () => {
  it("says where an in-person visit is, with no word of a link", () => {
    expect(place(booking)).toMatchObject({ value: "Poznań · Gabinet 1" });
    expect(place(booking)?.detail).toBeUndefined();
  });

  it("says an online visit's link comes before it", () => {
    expect(place({ ...booking, mode: "online" })).toMatchObject({
      value: "Online",
      detail: ONLINE_LINK_NOTE,
    });
  });
});
