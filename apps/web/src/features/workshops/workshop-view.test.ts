import type { PublicWorkshop } from "@repo/supabase/workshops";
import { describe, expect, it } from "vitest";
import {
  agendaPoints,
  readModality,
  peopleWord,
  seatsInfo,
  seatsWord,
  signupState,
  splitWorkshops,
  workshopCard,
  workshopEventJsonLd,
  workshopPlace,
  workshopPrice,
} from "./workshop-view";

const now = new Date("2030-11-01T10:00:00Z");

function workshop(patch: Partial<PublicWorkshop> = {}): PublicWorkshop {
  return {
    id: "w1",
    slug: "uwaznosc",
    title: "Uważność",
    shortDescription: "Krótko",
    body: null,
    audience: null,
    agenda: null,
    coverPath: null,
    coverAlt: null,
    seoTitle: null,
    seoDescription: null,
    modality: "in_person",
    status: "published",
    startsAt: "2030-11-12T16:00:00Z",
    endsAt: "2030-11-12T18:00:00Z",
    priceMinor: 15000,
    currencyCode: "PLN",
    capacity: 12,
    minParticipants: null,
    locationName: "Kolor Sensu",
    locationAddress: "ul. Spokojna 1, 00-001 Warszawa",
    locationCity: "Warszawa",
    roomName: "Sala duża",
    leaders: [
      { slug: "anna", name: "Anna Nowak", title: null, photoPath: null },
    ],
    seatsLeft: 8,
    registrationOpen: true,
    confirmed: true,
    updatedAt: "2030-10-01T10:00:00Z",
    ...patch,
  };
}

describe("the list", () => {
  it("shows the coming ones soonest first and the past ones latest first", () => {
    const all = [
      workshop({
        id: "later",
        startsAt: "2030-12-01T16:00:00Z",
        endsAt: "2030-12-01T18:00:00Z",
      }),
      workshop({ id: "soon" }),
      workshop({ id: "cancelled", status: "cancelled" }),
      workshop({
        id: "done",
        status: "completed",
        startsAt: "2030-10-01T16:00:00Z",
        endsAt: "2030-10-01T18:00:00Z",
      }),
      workshop({
        id: "over",
        startsAt: "2030-10-20T16:00:00Z",
        endsAt: "2030-10-20T18:00:00Z",
      }),
    ];
    const { upcoming, past } = splitWorkshops(all, now);
    expect(upcoming.map((one) => one.id)).toEqual([
      "soon",
      "cancelled",
      "later",
    ]);
    expect(past.map((one) => one.id)).toEqual(["over", "done"]);
  });

  it("filters by form, from the address", () => {
    const all = [
      workshop({ id: "here" }),
      workshop({ id: "web", modality: "online" }),
    ];
    expect(
      splitWorkshops(all, now, "online").upcoming.map((one) => one.id),
    ).toEqual(["web"]);
    expect(
      splitWorkshops(all, now, "stacjonarnie").upcoming.map((one) => one.id),
    ).toEqual(["here"]);
    expect(readModality("online")).toBe("online");
    expect(readModality("cokolwiek")).toBeNull();
  });
});

describe("a card's words", () => {
  it("says when, where and for how much, in the centre's time", () => {
    const card = workshopCard(workshop(), {
      now,
      timeZone: "Europe/Warsaw",
      imageUrl: (path) => `https://cdn.example.invalid/${path}`,
    });
    expect(card).toMatchObject({
      href: "/warsztaty/uwaznosc",
      dateLabel: "wtorek, 12 listopada 2030",
      timeLabel: "17:00–19:00",
      placeLabel: "Kolor Sensu, ul. Spokojna 1, 00-001 Warszawa",
      leaders: "Anna Nowak",
      statusLabel: null,
    });
    expect(workshopPrice(workshop({ priceMinor: 0 }))).toBe("Bezpłatnie");
    expect(workshopPlace(workshop({ modality: "online" }))).toBe("Online");
    expect(workshopPlace(workshop(), { room: true })).toContain("(Sala duża)");
  });

  it("says the seats when few or none are left", () => {
    expect(seatsInfo(workshop({ seatsLeft: 1 }), now).label).toBe(
      "Ostatnie miejsce",
    );
    expect(seatsInfo(workshop({ seatsLeft: 3 }), now).label).toBe(
      "Ostatnie 3 miejsca",
    );
    expect(seatsInfo(workshop({ seatsLeft: 0 }), now)).toEqual({
      label: "Brak miejsc · lista rezerwowa",
      tone: "full",
    });
    expect(seatsInfo(workshop(), now).label).toBeNull();
    expect([seatsWord(2), seatsWord(5), seatsWord(12), seatsWord(22)]).toEqual([
      "2 miejsca",
      "5 miejsc",
      "12 miejsc",
      "22 miejsca",
    ]);
    expect([peopleWord(1), peopleWord(3), peopleWord(5)]).toEqual([
      "1 osoba",
      "3 osoby",
      "5 osób",
    ]);
  });
});

describe("signing up", () => {
  it("is open, full, closed, cancelled or past", () => {
    expect(signupState(workshop(), now)).toBe("open");
    expect(signupState(workshop({ seatsLeft: 0 }), now)).toBe("full");
    expect(signupState(workshop({ registrationOpen: false }), now)).toBe(
      "closed",
    );
    expect(signupState(workshop({ status: "cancelled" }), now)).toBe(
      "cancelled",
    );
    expect(
      signupState(workshop({ startsAt: "2030-10-30T10:00:00Z" }), now),
    ).toBe("past");
  });
});

describe("the page", () => {
  it("reads the program's points without their marks", () => {
    expect(agendaPoints("- Oddech\n2) Ciało\n\n• Rozmowa")).toEqual([
      "Oddech",
      "Ciało",
      "Rozmowa",
    ]);
  });

  it("gives Google an Event", () => {
    const event = workshopEventJsonLd(workshop({ seatsLeft: 0 }), {
      siteUrl: "https://kolorsensu.example.invalid",
      imageUrl: (path) => path,
    });
    expect(event).toMatchObject({
      "@type": "Event",
      startDate: "2030-11-12T16:00:00Z",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@type": "Place", name: "Kolor Sensu" },
      offers: { price: "150.00", availability: "https://schema.org/SoldOut" },
      performer: [{ "@type": "Person", name: "Anna Nowak" }],
    });
  });
});
