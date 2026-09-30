import { describe, expect, it, vi } from "vitest";
import {
  claimBookingEmail,
  markBookingEmailSent,
  releaseBookingEmail,
} from "./booking-emails";

function rpcClient(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { client: { rpc } as never, rpc };
}

describe("claimBookingEmail", () => {
  it("gives what the e-mail needs, once", async () => {
    const { client, rpc } = rpcClient([
      {
        reference: "KS-20301002-1534",
        mode: "in_person",
        starts_at: "2030-10-02T09:00:00+00:00",
        ends_at: "2030-10-02T09:50:00+00:00",
        service_name: "Konsultacja",
        specialist_name: "Michał Stępień",
        room_name: "Gabinet Zielony",
        location_name: "Siedziba Główna",
        location_address: "Plac Wolności 18/518, 61-739 Poznań",
        price_minor: 20000,
        currency_code: "PLN",
        client_name: "Jan Kowalski",
        client_email: "jan@example.com",
        manage_token: "link-token",
        cancelled_by: null,
        booked_by: "centre",
        paid: false,
      },
    ]);
    expect(
      await claimBookingEmail(client, "KS-20301002-1534", "confirmation"),
    ).toEqual({
      reference: "KS-20301002-1534",
      mode: "in_person",
      startsAt: "2030-10-02T09:00:00+00:00",
      endsAt: "2030-10-02T09:50:00+00:00",
      serviceName: "Konsultacja",
      specialistName: "Michał Stępień",
      roomName: "Gabinet Zielony",
      locationName: "Siedziba Główna",
      locationAddress: "Plac Wolności 18/518, 61-739 Poznań",
      priceMinor: 20000,
      currencyCode: "PLN",
      clientName: "Jan Kowalski",
      clientEmail: "jan@example.com",
      manageToken: "link-token",
      cancelledBy: null,
      bookedBy: "centre",
      paid: false,
    });
    expect(rpc).toHaveBeenCalledWith("claim_booking_email", {
      p_reference: "KS-20301002-1534",
      p_kind: "confirmation",
    });
  });

  it("gives nothing when it is someone else's to send, or sent", async () => {
    expect(
      await claimBookingEmail(rpcClient([]).client, "KS-1", "confirmation"),
    ).toBeNull();
  });
});

describe("after sending", () => {
  it("records the message, or gives the claim back", async () => {
    const sent = rpcClient(null);
    await markBookingEmailSent(sent.client, "KS-1", "confirmation", "msg_1");
    expect(sent.rpc).toHaveBeenCalledWith("mark_booking_email_sent", {
      p_reference: "KS-1",
      p_kind: "confirmation",
      p_message_id: "msg_1",
    });
    const failed = rpcClient(null);
    await releaseBookingEmail(failed.client, "KS-1", "confirmation");
    expect(failed.rpc).toHaveBeenCalledWith("release_booking_email", {
      p_reference: "KS-1",
      p_kind: "confirmation",
    });
  });
});
