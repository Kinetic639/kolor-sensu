import { describe, expect, it, vi } from "vitest";
import {
  BookingError,
  getBooking,
  saveBookingDetails,
  getBookingWindow,
  holdSlot,
  listBookableCatalog,
  listFreeSlots,
  releaseHold,
  reserveHold,
  confirmReservation,
  reservationConfirmBy,
} from "./booking";

function rpcClient(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { client: { rpc } as never, rpc };
}

const offerRow = {
  service_id: "service-1",
  service_slug: "konsultacja",
  service_name: "Konsultacja psychologiczna",
  service_short_description: "Pierwsze spotkanie.",
  service_description: null,
  service_category: "consultation",
  service_default_duration_minutes: 50,
  specialist_slug: "anna",
  specialist_name: "Anna Kłobuchowska",
  specialist_title: "Psycholożka",
  specialist_photo_path: "anna/photo.webp",
  duration_minutes: 50,
  price_minor: 25000,
  currency_code: "PLN",
  supports_in_person: true,
  supports_online: false,
};

describe("listBookableCatalog", () => {
  it("gives each bookable service once, and every offer with its specialist", async () => {
    const { client, rpc } = rpcClient([
      offerRow,
      { ...offerRow, specialist_slug: "jan", specialist_name: "Jan Nowak" },
    ]);
    const catalog = await listBookableCatalog(client);

    expect(rpc).toHaveBeenCalledWith("list_bookable_offers");
    expect(catalog.services).toEqual([
      {
        id: "service-1",
        slug: "konsultacja",
        name: "Konsultacja psychologiczna",
        shortDescription: "Pierwsze spotkanie.",
        description: null,
        category: "consultation",
        defaultDurationMinutes: 50,
      },
    ]);
    expect(catalog.offers[0]).toEqual({
      serviceId: "service-1",
      serviceName: "Konsultacja psychologiczna",
      serviceSlug: "konsultacja",
      specialistPublicSlug: "anna",
      specialistName: "Anna Kłobuchowska",
      specialistProfessionalTitle: "Psycholożka",
      specialistPhotoPath: "anna/photo.webp",
      priceMinor: 25000,
      currencyCode: "PLN",
      effectiveDurationMinutes: 50,
      supportsInPerson: true,
      supportsOnline: false,
    });
    expect(catalog.offers).toHaveLength(2);
  });
});

describe("getBookingWindow", () => {
  it("reads the centre's time zone, horizon, hold and change policy", async () => {
    const { client } = rpcClient([
      {
        time_zone: "Europe/Warsaw",
        horizon_days: 60,
        hold_minutes: 10,
        cancellation_window_hours: 48,
        reschedule_window_hours: 48,
        max_self_reschedules: 1,
        payment_due_hours: 48,
        slot_step_minutes: 60,
      },
    ]);
    expect(await getBookingWindow(client)).toEqual({
      timeZone: "Europe/Warsaw",
      horizonDays: 60,
      holdMinutes: 10,
      cancellationWindowHours: 48,
      rescheduleWindowHours: 48,
      maxSelfReschedules: 1,
      paymentDueHours: 48,
      slotStepMinutes: 60,
    });
  });

  it("the grid every full hour where the database does not say yet", async () => {
    const { client } = rpcClient([
      {
        time_zone: "Europe/Warsaw",
        horizon_days: 60,
        hold_minutes: 10,
        cancellation_window_hours: 48,
        reschedule_window_hours: 48,
        max_self_reschedules: 1,
        payment_due_hours: 48,
      },
    ]);
    expect((await getBookingWindow(client))!.slotStepMinutes).toBe(60);
  });
});

describe("listFreeSlots", () => {
  it("asks for a week of one offer's free times, in a form and a place", async () => {
    const rows = [
      {
        starts_at: "2030-01-07T08:00:00+00:00",
        ends_at: "2030-01-07T08:50:00+00:00",
      },
    ];
    const { client, rpc } = rpcClient(rows);
    const slots = await listFreeSlots(client, {
      serviceSlug: "konsultacja",
      specialistSlug: "anna",
      mode: "in_person",
      from: "2030-01-07",
      to: "2030-01-13",
      locationSlug: "centrum",
    });
    expect(rpc).toHaveBeenCalledWith("list_free_slots", {
      p_service_slug: "konsultacja",
      p_specialist_slug: "anna",
      p_mode: "in_person",
      p_from: "2030-01-07",
      p_to: "2030-01-13",
      p_location_slug: "centrum",
    });
    expect(slots).toEqual(rows);
  });
});

describe("holdSlot", () => {
  const input = {
    serviceSlug: "konsultacja",
    specialistSlug: "anna",
    mode: "online" as const,
    startsAt: "2030-01-07T12:00:00.000Z",
    clientKey: "visitor-key",
  };

  it("holds a time and returns its token", async () => {
    const { client, rpc } = rpcClient([
      {
        appointment_id: "visit-1",
        reference: "KS-20300107-1234",
        access_token: "token",
        hold_expires_at: "2030-01-01T10:10:00+00:00",
      },
    ]);
    expect(await holdSlot(client, input)).toEqual({
      appointmentId: "visit-1",
      reference: "KS-20300107-1234",
      accessToken: "token",
      holdExpiresAt: "2030-01-01T10:10:00+00:00",
    });
    expect(rpc).toHaveBeenCalledWith("hold_slot", {
      p_service_slug: "konsultacja",
      p_specialist_slug: "anna",
      p_mode: "online",
      p_starts_at: "2030-01-07T12:00:00.000Z",
      p_client_key: "visitor-key",
      p_location_slug: undefined,
    });
  });

  it("says why a time could not be held", async () => {
    const { client } = rpcClient(null, {
      message: "This time is not free",
      hint: "slot_unavailable",
    });
    await expect(holdSlot(client, input)).rejects.toMatchObject({
      name: "BookingError",
      code: "slot_unavailable",
    });
    await expect(holdSlot(client, input)).rejects.toBeInstanceOf(BookingError);
    const { client: busy } = rpcClient(null, {
      message: "Too many",
      hint: "too_many_holds",
    });
    await expect(holdSlot(busy, input)).rejects.toMatchObject({
      code: "too_many_holds",
    });
  });
});

describe("a guest's visit by token", () => {
  it("reads it, or nothing for a wrong token", async () => {
    const row = {
      reference: "KS-20300107-1234",
      status: "held",
      mode: "in_person",
      starts_at: "2030-01-07T09:00:00+00:00",
      ends_at: "2030-01-07T09:50:00+00:00",
      hold_expires_at: "2030-01-01T10:10:00+00:00",
      service_name: "Konsultacja",
      specialist_name: "Anna",
      room_name: "Gabinet Zielony",
      location_name: "Siedziba",
      price_minor: 25000,
      currency_code: "PLN",
      client_name: "Jan Kowalski",
      client_email: "jan@example.com",
      client_phone: "600100200",
      client_notes: null,
      details_saved: true,
      reschedule_count: 1,
      cancelled_by: null,
      refund_due_minor: null,
      refunded_minor: 0,
      booked_by: "client",
      paid: true,
    };
    expect(await getBooking(rpcClient([row]).client, "token")).toMatchObject({
      details: {
        name: "Jan Kowalski",
        email: "jan@example.com",
        phone: "600100200",
        notes: null,
      },
      reference: "KS-20300107-1234",
      status: "held",
      startsAt: "2030-01-07T09:00:00+00:00",
      roomName: "Gabinet Zielony",
      rescheduleCount: 1,
      cancelledBy: null,
      refundDueMinor: null,
      refundedMinor: 0,
      bookedBy: "client",
      paid: true,
    });
    expect(await getBooking(rpcClient([]).client, "wrong")).toBeNull();
  });

  it("lets a hold go", async () => {
    const { client, rpc } = rpcClient(true);
    expect(await releaseHold(client, "token")).toBe(true);
    expect(rpc).toHaveBeenCalledWith("release_hold", {
      p_access_token: "token",
    });
  });
});

describe("saveBookingDetails", () => {
  const details = {
    name: "Jan Kowalski",
    email: "jan@example.com",
    phone: "600100200",
    notes: null,
    acceptTerms: true as const,
    acceptPrivacy: true as const,
  };

  it("saves the details and consents to the held visit", async () => {
    const { client, rpc } = rpcClient(null);
    await saveBookingDetails(client, "token", details);
    expect(rpc).toHaveBeenCalledWith("save_booking_details", {
      p_access_token: "token",
      p_name: "Jan Kowalski",
      p_email: "jan@example.com",
      p_phone: "600100200",
      p_notes: "",
      p_accept_terms: true,
      p_accept_privacy: true,
    });
  });

  it("says when the hold has expired", async () => {
    const { client } = rpcClient(null, {
      message: "expired",
      hint: "hold_expired",
    });
    await expect(
      saveBookingDetails(client, "token", details),
    ).rejects.toMatchObject({
      code: "hold_expired",
    });
  });
});

describe("reserveHold", () => {
  it("reserves the held visit until it is confirmed, then paid", async () => {
    const { client, rpc } = rpcClient([
      {
        reference: "2610-004",
        outcome: "reserved",
        payment_due_at: "2030-10-01T09:00:00+00:00",
        confirm_by: "2030-09-29T09:30:00+00:00",
      },
    ]);
    expect(await reserveHold(client, "token", "visitor-key")).toEqual({
      reference: "2610-004",
      outcome: "reserved",
      paymentDueAt: "2030-10-01T09:00:00+00:00",
      confirmBy: "2030-09-29T09:30:00+00:00",
    });
    expect(rpc).toHaveBeenCalledWith("reserve_hold", {
      p_access_token: "token",
      p_client_key: "visitor-key",
    });
  });

  it("says when the person has too many unpaid reservations", async () => {
    const { client } = rpcClient([
      {
        reference: "2610-005",
        outcome: "pay_now",
        payment_due_at: null,
        confirm_by: null,
      },
    ]);
    expect(await reserveHold(client, "token")).toMatchObject({
      outcome: "pay_now",
      paymentDueAt: null,
    });
  });

  it("refuses a visit too close to pay later", async () => {
    const { client } = rpcClient(null, {
      message: "This visit is paid at once",
      hint: "pay_now_required",
    });
    await expect(reserveHold(client, "token")).rejects.toMatchObject({
      code: "pay_now_required",
    });
  });
});

describe("confirmReservation", () => {
  it("gives the time to pay by, or null", async () => {
    const { client, rpc } = rpcClient("2030-09-30T09:00:00+00:00");
    expect(await confirmReservation(client, "link")).toBe(
      "2030-09-30T09:00:00+00:00",
    );
    expect(rpc).toHaveBeenCalledWith("confirm_reservation", {
      p_manage_token: "link",
    });
    expect(await confirmReservation(rpcClient(null).client, "link")).toBeNull();
  });
});

describe("reservationConfirmBy", () => {
  it("asks by the link's token", async () => {
    const { client, rpc } = rpcClient("2030-09-29T09:30:00+00:00");
    expect(await reservationConfirmBy(client, "link")).toBe(
      "2030-09-29T09:30:00+00:00",
    );
    expect(rpc).toHaveBeenCalledWith("reservation_confirm_by", {
      p_manage_token: "link",
    });
  });
});
