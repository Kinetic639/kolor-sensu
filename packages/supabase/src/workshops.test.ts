import { describe, expect, it, vi } from "vitest";
import {
  getWorkshopPicks,
  getWorkshopRegistration,
  holdWorkshopSeat,
  listPublicWorkshops,
  WorkshopError,
} from "./workshops";

// Workshops through the database's functions: the public list as the site
// reads it (its leaders kept only when well formed), a refusal kept as the
// database's hint, and a registration with its details and code.

function rpc(data: unknown, error: unknown = null) {
  const call = vi.fn().mockResolvedValue({ data, error });
  return { call, client: { rpc: call } as never };
}

const row = {
  id: "w1",
  slug: "uwaznosc",
  title: "Uważność na co dzień",
  short_description: "Krótko",
  body: null,
  audience: null,
  agenda: "Oddech\nCiało",
  cover_image_path: "workshops/w1.webp",
  cover_alt: "Kubek herbaty",
  seo_title: null,
  seo_description: null,
  modality: "in_person",
  status: "published",
  starts_at: "2030-11-12T16:00:00Z",
  ends_at: "2030-11-12T18:00:00Z",
  price_minor: 15000,
  currency_code: "PLN",
  capacity: 12,
  min_participants: 4,
  location_name: "Centrum",
  location_address: "ul. Spokojna 1, 00-001 Warszawa",
  location_city: "Warszawa",
  room_name: "Sala duża",
  leaders: [
    { slug: "anna", name: "Anna Nowak", title: "Psycholożka", photoPath: null },
    { name: "Bez adresu" },
  ],
  seats_left: 3,
  registration_open: true,
  confirmed: false,
  updated_at: "2030-10-01T10:00:00Z",
};

describe("the public workshops", () => {
  it("are read as the site shows them", async () => {
    const { client } = rpc([row]);
    const [workshop] = await listPublicWorkshops(client);
    expect(workshop).toMatchObject({
      slug: "uwaznosc",
      coverPath: "workshops/w1.webp",
      seatsLeft: 3,
      registrationOpen: true,
      confirmed: false,
      minParticipants: 4,
    });
    expect(workshop!.leaders).toEqual([
      {
        slug: "anna",
        name: "Anna Nowak",
        title: "Psycholożka",
        photoPath: null,
      },
    ]);
  });
});

describe("a guest's seat", () => {
  it("keeps the database's refusal", async () => {
    const { client } = rpc(null, {
      message: "The workshop is full",
      hint: "full",
    });
    const error = await holdWorkshopSeat(client, "uwaznosc", "key").catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(WorkshopError);
    expect(error.code).toBe("full");
  });

  it("calls anything else unknown", async () => {
    const { client } = rpc(null, { message: "boom", hint: "something" });
    const error = await holdWorkshopSeat(client, "uwaznosc", "key").catch(
      (e) => e,
    );
    expect(error.code).toBe("unknown");
  });

  it("reads a registration with its details and code", async () => {
    const { client } = rpc([
      {
        reference: "W2611-001",
        status: "held",
        workshop_slug: "uwaznosc",
        workshop_title: "Uważność",
        workshop_status: "published",
        workshop_confirmed: true,
        modality: "online",
        starts_at: "2030-11-12T16:00:00Z",
        ends_at: "2030-11-12T18:00:00Z",
        location_name: null,
        location_address: null,
        room_name: null,
        price_minor: 7500,
        currency_code: "PLN",
        paid_minor: 0,
        refund_due_minor: 0,
        refunded_minor: 0,
        client_name: "Ola",
        client_email: "ola@example.invalid",
        client_phone: "500600700",
        client_notes: null,
        details_saved: true,
        hold_expires_at: "2030-11-01T10:10:00Z",
        payment_due_at: null,
        offer_expires_at: null,
        waitlist_position: null,
        full_refund_until: "2030-11-05T16:00:00Z",
        can_pay_later: true,
        cancelled_by: null,
        meeting_url: null,
        list_price_minor: 15000,
        discount_minor: 7500,
        discount_code: "POLOWA",
      },
    ]);
    const registration = await getWorkshopRegistration(client, "token");
    expect(registration).toMatchObject({
      reference: "W2611-001",
      details: {
        firstName: "Ola",
        lastName: "",
        email: "ola@example.invalid",
        phone: "500600700",
      },
      canPayLater: true,
      discount: { code: "POLOWA", listPriceMinor: 15000, discountMinor: 7500 },
    });
  });

  it("reads none for an unknown token", async () => {
    const { client } = rpc([]);
    expect(await getWorkshopRegistration(client, "nope")).toBeNull();
  });
});

describe("a workshop's picks (#185)", () => {
  it("are the services and articles the admin chose for it", async () => {
    const eq = vi.fn((_column: string, id: string) =>
      Promise.resolve({
        data: id === "w1" ? [{ service_id: "s1" }, { service_id: "s2" }] : [],
        error: null,
      }),
    );
    const tables: string[] = [];
    const client = {
      from: (table: string) => {
        tables.push(table);
        return {
          select: () => ({
            eq:
              table === "workshop_services"
                ? eq
                : () =>
                    Promise.resolve({
                      data: [{ article_id: "a1" }],
                      error: null,
                    }),
          }),
        };
      },
    } as never;
    expect(await getWorkshopPicks(client, "w1")).toEqual({
      serviceIds: ["s1", "s2"],
      articleIds: ["a1"],
    });
    expect(tables).toEqual(["workshop_services", "workshop_articles"]);
    expect(eq).toHaveBeenCalledWith("workshop_id", "w1");
  });

  it("say why they could not be read", async () => {
    const failed = () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: null, error: new Error("down") }),
      }),
    });
    await expect(
      getWorkshopPicks({ from: failed } as never, "w1"),
    ).rejects.toThrow("down");
  });
});
