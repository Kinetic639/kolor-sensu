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
  workshopWayThere,
  workshopPrice,
  workshopRules,
  workshopSeo,
  relatedServices,
  relatedWorkshops,
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
    locationDirections: null,
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
  it("always includes free and total seats for upcoming workshops", () => {
    const card = (patch: Partial<PublicWorkshop>) =>
      workshopCard(workshop(patch), {
        now,
        timeZone: "Europe/Warsaw",
        imageUrl: (path) => path,
      });
    expect(card({}).availabilityLabel).toBe("8 z 12");
    expect(card({ seatsLeft: 0 }).availabilityLabel).toBe("0 z 12");
    expect(card({ status: "cancelled" }).availabilityLabel).toBeNull();
    expect(card({ status: "completed" }).availabilityLabel).toBeNull();
  });
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

describe("the way there", () => {
  it("says how to get there and opens the maps at the address", () => {
    const way = workshopWayThere(
      workshop({ locationDirections: "Wejście od podwórza, 2. piętro." }),
    );
    expect(way).toEqual({
      directions: "Wejście od podwórza, 2. piętro.",
      mapsHref:
        "https://www.google.com/maps/search/?api=1&query=Kolor%20Sensu%2C%20ul.%20Spokojna%201%2C%2000-001%20Warszawa",
    });
  });

  it("has only the maps without words, and nothing online or with no address", () => {
    expect(workshopWayThere(workshop())?.directions).toBeNull();
    expect(workshopWayThere(workshop({ modality: "online" }))).toBeNull();
    expect(
      workshopWayThere(workshop({ locationName: null, locationAddress: null })),
    ).toBeNull();
  });
});

describe("related", () => {
  const day = (n: number, hour: string) =>
    `2030-11-${String(n).padStart(2, "0")}T${hour}:00:00Z`;
  const on = (id: string, n: number, patch: Partial<PublicWorkshop> = {}) =>
    workshop({ id, startsAt: day(n, "16"), endsAt: day(n, "18"), ...patch });

  it("are the other coming workshops, soonest first, three at most", () => {
    const all = [
      on("this", 12),
      on("late", 28),
      on("soon", 5),
      on("off", 6, { status: "cancelled" }),
      on("mid", 15),
      on("next", 20),
      workshop({
        id: "gone",
        startsAt: "2030-10-01T16:00:00Z",
        endsAt: "2030-10-01T18:00:00Z",
      }),
    ];
    expect(relatedWorkshops(all[0]!, all, now).map((one) => one.id)).toEqual([
      "soon",
      "mid",
      "next",
    ]);
  });

  it("offer each of the leader's services once", () => {
    const offer = (slug: string, name: string) => ({
      serviceId: slug,
      serviceName: name,
      serviceSlug: slug,
      specialistPublicSlug: "anna",
      specialistProfessionalTitle: null,
      priceMinor: 20000,
      currencyCode: "PLN",
      effectiveDurationMinutes: 50,
      supportsInPerson: true,
      supportsOnline: true,
    });
    expect(
      relatedServices([
        offer("konsultacja", "Konsultacja"),
        offer("terapia", "Terapia"),
        offer("konsultacja", "Konsultacja"),
      ]),
    ).toEqual([
      { name: "Konsultacja", slug: "konsultacja" },
      { name: "Terapia", slug: "terapia" },
    ]);
  });
});

describe("the rules (#275)", () => {
  // `now` is 2030-11-01; the workshop starts on 2030-11-12, so the week
  // before it begins on 2030-11-05.
  const notice = "5 listopada";

  it("give a full refund and paying later until a week before", () => {
    const rules = workshopRules(workshop(), now, notice)!;
    expect(rules[0]).toMatch(/^Rezygnacja do 5 listopada: pełny zwrot\./);
    expect(rules[1]).toMatch(/zapłacić do 5 listopada/);
    expect(rules).toContain(
      "Gdy warsztat odwołamy my, zawsze oddajemy całą wpłatę.",
    );
  });

  it("in the last week: pay at once, a refund only when the seat is taken", () => {
    const rules = workshopRules(
      workshop(),
      new Date("2030-11-08T10:00:00Z"),
      notice,
    )!;
    expect(rules[0]).toBe(
      "Do warsztatu został mniej niż tydzień: płacisz od razu, przy zapisie.",
    );
    expect(rules.join(" ")).not.toMatch(/pełny zwrot|zapłacić do/);
    expect(rules[1]).toMatch(/gdy Twoje miejsce zajmie ktoś z listy/);
  });

  it("say the minimum and, online, when the link comes", () => {
    const rules = workshopRules(
      workshop({ minParticipants: 3, modality: "online" }),
      now,
      notice,
    )!;
    expect(rules).toContain(
      "Warsztat odbędzie się, gdy zapisze się co najmniej 3 osoby. Gdyby nie doszedł do skutku, oddamy całą wpłatę.",
    );
    expect(rules).toContain(
      "Link do spotkania wyślemy e-mailem dzień przed warsztatem.",
    );
  });

  it("say nothing of money for a free workshop", () => {
    const rules = workshopRules(workshop({ priceMinor: 0 }), now, notice)!;
    expect(rules.join(" ")).not.toMatch(/Rezygnacja|zapłacić/);
  });

  it("are none once cancelled or over", () => {
    expect(
      workshopRules(workshop({ status: "cancelled" }), now, notice),
    ).toBeNull();
    expect(
      workshopRules(workshop({ status: "completed" }), now, notice),
    ).toBeNull();
    expect(
      workshopRules(workshop(), new Date("2030-11-13T10:00:00Z"), notice),
    ).toBeNull();
  });
});

describe("Google and link previews", () => {
  it("use the workshop's SEO title and description", () => {
    expect(
      workshopSeo(
        workshop({
          seoTitle: "Uważność jesienią",
          seoDescription: "Dwie godziny.",
        }),
      ),
    ).toEqual({ title: "Uważność jesienią", description: "Dwie godziny." });
  });

  it("fall back to the title and the short description", () => {
    expect(workshopSeo(workshop())).toEqual({
      title: "Uważność · Warsztaty",
      description: "Krótko",
    });
    expect(workshopSeo(workshop({ shortDescription: null })).description).toBe(
      "Warsztat w Kolor Sensu: Uważność.",
    );
  });
});
