import { describe, expect, it, vi } from "vitest";
import { centreBookVisit, listCentreOffers } from "./centre-bookings";

const OFFER = "10000000-0000-4000-8000-000000000001";
const ROOM = "20000000-0000-4000-8000-000000000001";

function rpcClient(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { client: { rpc } as never, rpc };
}

const input = {
  offerId: OFFER,
  mode: "in_person" as const,
  startsAt: "2030-10-02T10:15:00.000Z",
  roomId: ROOM,
  client: {
    firstName: "Ewa",
    lastName: "Klientka",
    email: "ewa@example.com",
    phone: null,
    notes: null,
  },
};

describe("centreBookVisit", () => {
  it("books the visit and returns its number and time", async () => {
    const { client, rpc } = rpcClient([
      {
        appointment_id: "visit-1",
        reference: "3010-001",
        starts_at: "2030-10-02T10:15:00+00:00",
        ends_at: "2030-10-02T11:05:00+00:00",
        payment_due_at: "2030-09-30T10:15:00+00:00",
      },
    ]);
    expect(await centreBookVisit(client, input)).toEqual({
      id: "visit-1",
      reference: "3010-001",
      startsAt: "2030-10-02T10:15:00+00:00",
      endsAt: "2030-10-02T11:05:00+00:00",
      paymentDueAt: "2030-09-30T10:15:00+00:00",
    });
    expect(rpc).toHaveBeenCalledWith("centre_book_visit", {
      p_offer_id: OFFER,
      p_mode: "in_person",
      p_starts_at: "2030-10-02T10:15:00.000Z",
      p_room_id: ROOM,
      p_client_first_name: "Ewa",
      p_client_last_name: "Klientka",
      p_client_email: "ewa@example.com",
      p_client_phone: null,
      p_client_notes: null,
    });
  });

  it("an online visit goes without a room", async () => {
    const { client, rpc } = rpcClient([
      {
        appointment_id: "visit-2",
        reference: "3010-002",
        starts_at: "2030-10-02T10:15:00+00:00",
        ends_at: "2030-10-02T11:05:00+00:00",
      },
    ]);
    await centreBookVisit(client, { ...input, mode: "online" });
    expect(rpc).toHaveBeenCalledWith(
      "centre_book_visit",
      expect.objectContaining({ p_mode: "online", p_room_id: null }),
    );
  });

  it("says why the database refused it", async () => {
    for (const hint of [
      "specialist_busy",
      "room_busy",
      "room_closed",
      "room_required",
      "time_off",
      "in_the_past",
      "invalid_details",
      "not_bookable",
    ]) {
      const { client } = rpcClient(null, { message: "No", hint });
      await expect(centreBookVisit(client, input)).rejects.toMatchObject({
        name: "BookingError",
        code: hint,
      });
    }
  });

  it("a refused role is 'forbidden'", async () => {
    const { client } = rpcClient(null, {
      message: "Not allowed to manage this specialist",
      code: "42501",
    });
    await expect(centreBookVisit(client, input)).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("listCentreOffers", () => {
  it("the active offers of active specialists, with the service", async () => {
    const order = vi.fn();
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order,
    };
    order.mockResolvedValueOnce({
      data: [
        {
          id: OFFER,
          specialist_id: "anna",
          price_minor: 22000,
          currency_code: "PLN",
          duration_minutes: null,
          supports_in_person: true,
          supports_online: false,
          service: {
            id: "s1",
            name: "Konsultacja",
            default_duration_minutes: 50,
            active: true,
          },
          specialist: { active: true },
        },
        {
          id: "gone",
          specialist_id: "jan",
          price_minor: 1,
          currency_code: "PLN",
          duration_minutes: 30,
          supports_in_person: true,
          supports_online: true,
          service: {
            id: "s2",
            name: "Stara",
            default_duration_minutes: 30,
            active: false,
          },
          specialist: { active: true },
        },
      ],
      error: null,
    });
    const client = { from: vi.fn(() => query) };

    expect(await listCentreOffers(client as never)).toEqual([
      {
        id: OFFER,
        specialistId: "anna",
        serviceId: "s1",
        serviceName: "Konsultacja",
        priceMinor: 22000,
        currencyCode: "PLN",
        durationMinutes: 50,
        modes: ["in_person"],
      },
    ]);
    expect(client.from).toHaveBeenCalledWith("specialist_services");
    expect(query.eq).toHaveBeenCalledWith("active", true);
  });
});
