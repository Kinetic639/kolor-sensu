import type { WorkshopRegistration } from "@repo/supabase/workshops";
import { describe, expect, it } from "vitest";
import { refundRule, seatChoices } from "./registration-view";

const now = new Date("2030-11-01T10:00:00Z");
const zone = "Europe/Warsaw";

function registration(
  patch: Partial<WorkshopRegistration> = {},
): WorkshopRegistration {
  return {
    reference: "W2611-001",
    status: "confirmed",
    workshopSlug: "uwaznosc",
    workshopTitle: "Uważność",
    workshopStatus: "published",
    workshopConfirmed: true,
    modality: "online",
    startsAt: "2030-11-12T16:00:00Z",
    endsAt: "2030-11-12T18:00:00Z",
    locationName: null,
    locationAddress: null,
    locationDirections: null,
    roomName: null,
    priceMinor: 15000,
    currencyCode: "PLN",
    paidMinor: 15000,
    refundDueMinor: 0,
    refundedMinor: 0,
    details: {
      firstName: "Ola",
      lastName: "Nowak",
      email: "ola@example.invalid",
      phone: "500600700",
    },
    holdExpiresAt: null,
    paymentDueAt: null,
    offerExpiresAt: null,
    waitlistPosition: null,
    fullRefundUntil: "2030-11-05T16:00:00Z",
    canPayLater: false,
    cancelledBy: null,
    meetingUrl: null,
    discount: null,
    refundAnyTime: false,
    refundWhenReplaced: false,
    workshopCancelReason: null,
    paidOutside: false,
    ...patch,
  };
}

describe("a registration's choices", () => {
  it("a paid seat more than a week ahead: given up with all the money back, or passed on", () => {
    const choices = seatChoices(registration(), now, zone);
    expect(choices.cancel?.consequence).toMatch(/oddamy całe 150/);
    expect(choices.transfer).toBe(true);
  });

  it("within the week: money back only when the waitlist takes the seat", () => {
    const later = new Date("2030-11-08T10:00:00Z");
    expect(
      seatChoices(registration(), later, zone).cancel?.consequence,
    ).toMatch(/listy rezerwowej/);
    // After a new date: all of it, whenever.
    expect(
      seatChoices(registration({ refundAnyTime: true }), later, zone).cancel
        ?.consequence,
    ).toMatch(/oddamy całe/);
  });

  it("the waitlist: only leaving it", () => {
    const choices = seatChoices(
      registration({ status: "waitlisted", paidMinor: 0 }),
      now,
      zone,
    );
    expect(choices.cancel?.label).toBe("Wypisz się z listy rezerwowej");
    expect(choices.transfer).toBe(false);
  });

  it("nothing once it began, was cancelled or the workshop was", () => {
    expect(
      seatChoices(registration(), new Date("2030-11-12T17:00:00Z"), zone),
    ).toEqual({
      cancel: null,
      transfer: false,
    });
    expect(
      seatChoices(registration({ status: "cancelled" }), now, zone).cancel,
    ).toBeNull();
    expect(
      seatChoices(registration({ workshopStatus: "cancelled" }), now, zone)
        .cancel,
    ).toBeNull();
  });

  it("says the refund's rule", () => {
    expect(refundRule(registration(), zone)).toBe(
      "Pełny zwrot przy rezygnacji do 5 listopada 2030, godz. 17:00.",
    );
  });
});
