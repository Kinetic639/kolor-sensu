import { describe, expect, it, vi } from "vitest";
import {
  BookingError,
  getBooking,
  getBookingWindow,
  holdSlot,
  listBookableCatalog,
  listFreeSlots,
  releaseHold,
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
      acceptingNewClients: true,
    });
    expect(catalog.offers).toHaveLength(2);
  });
});

describe("getBookingWindow", () => {
  it("reads the centre's time zone, horizon and hold", async () => {
    const { client } = rpcClient([
      { time_zone: "Europe/Warsaw", horizon_days: 60, hold_minutes: 10 },
    ]);
    expect(await getBookingWindow(client)).toEqual({
      timeZone: "Europe/Warsaw",
      horizonDays: 60,
      holdMinutes: 10,
    });
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
    };
    expect(await getBooking(rpcClient([row]).client, "token")).toMatchObject({
      reference: "KS-20300107-1234",
      status: "held",
      startsAt: "2030-01-07T09:00:00+00:00",
      roomName: "Gabinet Zielony",
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
