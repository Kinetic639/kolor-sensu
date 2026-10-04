import { emptyRichTextDocument, type RichTextDocument } from "@repo/contracts";
import type { PersonalWeekView } from "@repo/scheduling";
import { describe, expect, it } from "vitest";
import type {
  SpecialistDetailViewModel,
  SpecialistDraftViewModel,
} from "./types";
import {
  createProfileDiff,
  detailState,
  mapSpecialistsListViewModel,
  offerSummary,
  profilePreview,
  sinceLabel,
  specialistState,
  offersBySpecialist,
  teamWeekSummary,
  toSpecialistOffers,
  toSpecialistRow,
} from "./view-model";

type Content = Omit<
  SpecialistDraftViewModel,
  "id" | "status" | "submittedAt" | "reviewComment"
>;

const snapshot: Content = {
  firstName: "Anna",
  lastName: "Kowalska",
  displayName: "Anna Kowalska",
  professionalTitle: "Psychoterapeutka",
  shortBio: "Opis",
  longBio: emptyRichTextDocument as RichTextDocument,
  profilePhotoUrl: "https://signed/a?token=1",
  profilePhotoPath: "s/profile-a.jpg",
  portraitPhotoUrl: null,
  portraitPhotoPath: null,
  languages: ["Polski"],
  therapyApproaches: [],
  specializations: [],
  education: [],
  certificates: [],
  modalities: [],
  clientGroups: ["Dorośli"],
};

function detail(draft: Partial<Content>): SpecialistDetailViewModel {
  return {
    id: "s",
    userId: "u",
    displayName: "Anna Kowalska",
    initials: "AK",
    color: null,
    accent: "var(--resource-1)",
    tint: "var(--resource-1-soft)",
    automaticAccent: "var(--resource-1)",
    avatarUrl: null,
    professionalTitle: "Psychoterapeutka",
    publicSlug: "anna",
    joinedAt: null,
    active: true,
    accountActive: true,
    offers: [],
    offerSummary: "Brak",
    publicProfile: {
      ...snapshot,
      publicationStatus: "published",
      publishedAt: null,
    },
    draft: {
      ...snapshot,
      // Every signed URL differs, even for the same file.
      profilePhotoUrl: "https://signed/a?token=2",
      ...draft,
      id: "d",
      status: "pending_review",
      submittedAt: null,
      reviewComment: null,
    },
  };
}

const byId = (fields: ReturnType<typeof createProfileDiff>, id: string) =>
  fields.find((field) => field.id === id);

describe("createProfileDiff", () => {
  it("treats the same stored photo as unchanged", () => {
    const fields = createProfileDiff(detail({}));
    expect(byId(fields, "profilePhoto")?.changed).toBe(false);
    expect(byId(fields, "portraitPhoto")?.changed).toBe(false);
  });

  it("shows a new photo with both images", () => {
    const fields = createProfileDiff(
      detail({
        portraitPhotoPath: "s/portrait-b.jpg",
        portraitPhotoUrl: "https://signed/b",
      }),
    );
    expect(byId(fields, "portraitPhoto")).toMatchObject({
      label: "Zdjęcie portretowe",
      changed: true,
      currentValue: "Brak zdjęcia",
      proposedValue: "Nowe zdjęcie",
      currentImageUrl: null,
      proposedImageUrl: "https://signed/b",
    });
  });

  it("reports a removed photo", () => {
    const fields = createProfileDiff(
      detail({ profilePhotoPath: null, profilePhotoUrl: null }),
    );
    expect(byId(fields, "profilePhoto")).toMatchObject({
      changed: true,
      proposedValue: "Zdjęcie usunięte",
    });
  });

  it("still compares the text fields", () => {
    const fields = createProfileDiff(
      detail({ languages: ["Polski", "Angielski"] }),
    );
    expect(byId(fields, "languages")).toMatchObject({
      changed: true,
      proposedValue: "Polski, Angielski",
    });
    expect(byId(fields, "firstName")?.changed).toBe(false);
  });

  it("compares the first and the last name each on its own", () => {
    const fields = createProfileDiff(
      detail({ lastName: "Nowak", displayName: "Anna Nowak" }),
    );
    expect(byId(fields, "firstName")).toMatchObject({
      label: "Imię",
      changed: false,
    });
    expect(byId(fields, "lastName")).toMatchObject({
      label: "Nazwisko",
      changed: true,
      currentValue: "Kowalska",
      proposedValue: "Nowak",
    });
    expect(byId(fields, "displayName")).toBeUndefined();
  });

  it("shows who the specialist proposes to work with", () => {
    const fields = createProfileDiff(
      detail({ clientGroups: ["Dorośli", "Pary"] }),
    );
    expect(byId(fields, "clientGroups")).toMatchObject({
      label: "Z kim pracuje",
      changed: true,
      currentValue: "Dorośli",
      proposedValue: "Dorośli, Pary",
    });
  });
});

describe("createProfileDiff: title and rich text bio", () => {
  const bio = (text: string): RichTextDocument => ({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });

  it("shows a proposed professional title", () => {
    const fields = createProfileDiff(
      detail({ professionalTitle: "Psycholog" }),
    );
    expect(byId(fields, "professionalTitle")).toMatchObject({
      label: "Tytuł zawodowy",
      currentValue: "Psychoterapeutka",
      proposedValue: "Psycholog",
      changed: true,
    });
  });

  it("compares the bio as a document and shows its text", () => {
    const fields = createProfileDiff(detail({ longBio: bio("Nowy opis") }));
    expect(byId(fields, "longBio")).toMatchObject({
      currentValue: "Brak",
      proposedValue: "Nowy opis",
      changed: true,
    });
  });

  it("notices formatting-only changes", () => {
    const bold: RichTextDocument = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Opis", marks: [{ type: "bold" }] }],
        },
      ],
    };
    const fields = createProfileDiff({
      ...detail({ longBio: bold }),
      publicProfile: {
        ...detail({}).publicProfile!,
        longBio: bio("Opis"),
      },
    });
    expect(byId(fields, "longBio")).toMatchObject({
      currentValue: "Opis",
      proposedValue: "Opis (zmienione formatowanie)",
      changed: true,
    });
  });
});

describe("mapSpecialistsListViewModel: colours", () => {
  const summary = {
    id: "specialist-1",
    userId: "user-1",
    firstName: "Anna",
    lastName: "Kowalska",
    avatarUrl: null,
    accountActive: true,
    active: true,
    publicSlug: "anna-kowalska",
    professionalTitle: "Psychoterapeutka",
    joinedAt: null,
    color: "#7c3aed",
    publicDisplayName: "Anna Kowalska",
    publicProfilePhotoUrl: null,
    publicationStatus: "published" as const,
    pendingDraftId: null,
    pendingDraftSubmittedAt: null,
    serviceCount: 0,
  };

  it("shows each specialist in their colour, or the automatic one", () => {
    const { items } = mapSpecialistsListViewModel([
      summary,
      { ...summary, id: "specialist-2", color: null },
    ]);
    expect(items[0]!.accent).toBe("#7c3aed");
    // The whole avatar in their colour: a light tint behind the initials.
    expect(items[0]!.tint).toBe(
      "color-mix(in srgb, #7c3aed 8%, var(--surface))",
    );
    expect(items[1]!.accent).toMatch(/^var\(--resource-[1-6]\)$/);
  });

  it("shows the account's picture, else the published profile photo", () => {
    const photos = new Map([["anna/photo.webp", "https://signed/anna"]]);
    const { items } = mapSpecialistsListViewModel(
      [
        { ...summary, publicProfilePhotoUrl: "anna/photo.webp" },
        {
          ...summary,
          id: "specialist-2",
          avatarUrl: "https://account/jan.png",
          publicProfilePhotoUrl: "jan/photo.webp",
        },
        { ...summary, id: "specialist-3", publicProfilePhotoUrl: null },
      ],
      photos,
    );
    expect(items.map((item) => item.avatarUrl)).toEqual([
      "https://signed/anna",
      "https://account/jan.png",
      null,
    ]);
  });
});

describe("toSpecialistRow", () => {
  const base = mapSpecialistsListViewModel([
    {
      id: "specialist-1",
      userId: "user-1",
      firstName: "Anna",
      lastName: "Kowalska",
      avatarUrl: null,
      accountActive: true,
      active: true,
      publicSlug: "anna-kowalska",
      professionalTitle: "Psychoterapeutka",
      joinedAt: "2026-03-01",
      color: "#7c3aed",
      publicDisplayName: "Anna Kowalska",
      publicProfilePhotoUrl: null,
      publicationStatus: "published",
      pendingDraftId: null,
      pendingDraftSubmittedAt: null,
      serviceCount: 1,
    },
  ]).items[0]!;

  const green = {
    id: "green",
    name: "Gabinet Zielony",
    short: "GZ",
    color: "#1e9e57",
    online: false,
  };
  const week = {
    from: "2030-09-30",
    now: null,
    columns: [
      {
        date: "2030-09-30",
        isToday: false,
        availability: [{ time: "08:00–12:00", place: green }],
        visits: [],
        occupancy: {
          availableHours: 4,
          bookedHours: 0.8,
          percent: 21,
          overbooked: false,
        },
      },
    ],
    summary: {
      visitCount: 1,
      occupancy: {
        visitCount: 1,
        bookedMinutes: 50,
        availableMinutes: 240,
        bookedHours: 0.8,
        availableHours: 4,
        freeHours: 3.2,
        percent: 21,
        overbooked: false,
        overMinutes: 0,
      },
      upcoming: [
        {
          visitId: "visit-1",
          date: "2030-09-30",
          day: "Pon, 30 wrz",
          time: "10:00 – 10:50",
          startTime: "10:00",
          service: "Konsultacja",
          pending: false,
          client: "Jan Kowalski",
          place: green,
        },
      ],
    },
  } as unknown as PersonalWeekView;

  it("who, their colour and state, and this week", () => {
    const row = toSpecialistRow(base, week);
    expect(row).toMatchObject({
      id: "specialist-1",
      name: "Anna Kowalska",
      title: "Psychoterapeutka",
      color: "#7c3aed",
      href: "/specjalisci/specialist-1",
      services: 1,
      since: "od 03.2026",
      slug: "anna-kowalska",
      state: {
        active: true,
        profile: "published",
      },
      occupancy: { percent: 21 },
      // Another week than this one: nothing to say about now.
      now: null,
      upcoming: [
        {
          visitId: "visit-1",
          dateLabel: "Pn 30.9",
          startTime: "10:00",
          client: "Jan Kowalski",
        },
      ],
    });
    expect(row.days).toHaveLength(7);
    expect(row.days[0]).toMatchObject({
      weekday: "Pn",
      shifts: [{ place: green }],
    });
  });

  it("the team's week in a line", () => {
    const row = toSpecialistRow(base, week);
    expect(teamWeekSummary([row, row])).toBe(
      "Zespół: 2 wizyty · 21% obłożenia",
    );
    expect(teamWeekSummary([])).toBe("Zespół: 0 wizyt · 0% obłożenia");
  });

  it("a profile to review; off when they or their account are", () => {
    expect(specialistState({ ...base, pendingDraft: true }).profile).toBe(
      "pending",
    );
    expect(specialistState({ ...base, publicationStatus: null }).profile).toBe(
      "none",
    );
    for (const change of [{ active: false }, { accountActive: false }]) {
      expect(specialistState({ ...base, ...change }).active).toBe(false);
    }
  });
});

describe("toSpecialistOffers", () => {
  const service = {
    id: "service-1",
    name: "Terapia dla par",
    slug: "terapia-par",
    shortDescription: null,
    description: null,
    category: "couples_therapy" as const,
    defaultDurationMinutes: 50,
    afterMinutes: 10,
    active: true,
    publiclyVisible: true,
    bookingEnabled: true,
    sortOrder: 1,
    catalogId: null,
    createdAt: "",
    updatedAt: "",
  };
  const offer = {
    id: "offer-1",
    specialistId: "specialist-1",
    serviceId: "service-1",
    active: true,
    priceMinor: 28000,
    currencyCode: "PLN",
    durationMinutes: null,
    supportsInPerson: true,
    supportsOnline: false,
    createdAt: "",
    updatedAt: "",
  };

  it("the service's name and category, their price and time", () => {
    const [mapped] = toSpecialistOffers([offer], [service]);
    expect(mapped).toEqual({
      id: "offer-1",
      serviceName: "Terapia dla par",
      category: "Terapia par",
      // Intl puts a no-break space before the currency.
      price: expect.stringMatching(/^280\s+zł$/),
      duration: "50 min",
      inPerson: true,
      online: false,
      active: true,
    });
    expect(
      toSpecialistOffers(
        [{ ...offer, priceMinor: 24550, durationMinutes: 80 }],
        [],
      )[0],
    ).toMatchObject({
      serviceName: "Usługa niedostępna w katalogu",
      category: null,
      price: expect.stringMatching(/^245,50\s+zł$/),
      duration: "80 min",
    });
  });
});

describe("offersBySpecialist", () => {
  it("each specialist's offers, mapped", () => {
    const offer = (id: string, specialistId: string) => ({
      id,
      specialistId,
      serviceId: "missing",
      active: true,
      priceMinor: 20000,
      currencyCode: "PLN",
      durationMinutes: 50,
      supportsInPerson: true,
      supportsOnline: false,
      createdAt: "",
      updatedAt: "",
    });
    const grouped = offersBySpecialist(
      [offer("o1", "a"), offer("o2", "b"), offer("o3", "a")],
      [],
    );
    expect(Object.keys(grouped)).toEqual(["a", "b"]);
    expect(grouped.a!.map((one) => one.id)).toEqual(["o1", "o3"]);
  });
});

describe("sinceLabel", () => {
  it("the month and year they joined", () => {
    expect(sinceLabel("2026-03-14")).toBe("od 03.2026");
    expect(sinceLabel(null)).toBeNull();
  });
});

describe("offerSummary", () => {
  const offer = (priceMinor: number, active = true) => ({
    id: `offer-${priceMinor}`,
    specialistId: "s",
    serviceId: "service",
    active,
    priceMinor,
    currencyCode: "PLN",
    durationMinutes: 50,
    supportsInPerson: true,
    supportsOnline: true,
    createdAt: "",
    updatedAt: "",
  });

  it("the active ones and the lowest price", () => {
    expect(
      offerSummary([offer(24000), offer(19500), offer(9000, false)]),
    ).toMatch(/^2 · od 195\s+zł$/);
    expect(offerSummary([offer(24000, false)])).toBe("Wszystkie wyłączone");
    expect(offerSummary([])).toBe("Brak");
  });
});

describe("detailState", () => {
  it("a draft waiting outranks the published profile", () => {
    expect(detailState(detail({}))).toEqual({
      active: true,
      profile: "pending",
    });
    expect(
      detailState({ ...detail({}), draft: null, accountActive: false }),
    ).toEqual({
      active: false,
      profile: "published",
    });
  });
});

describe("profilePreview", () => {
  const offer = {
    id: "o1",
    serviceName: "Terapia dla par",
    category: "Terapia par",
    price: "280 zł",
    duration: "50 min",
    inPerson: true,
    online: true,
    active: true,
  };

  it("the published profile, as the site shows it", () => {
    const preview = profilePreview(
      { ...detail({}), offers: [offer, { ...offer, id: "o2", active: false }] },
      "published",
    );
    expect(preview).toMatchObject({
      version: "published",
      name: "Anna Kowalska",
      role: "Psychoterapeutka",
      shortBio: "Opis",
      offers: [
        {
          key: "o1",
          name: "Terapia dla par",
          meta: "50 min · w gabinecie lub online",
          price: "280 zł",
        },
      ],
    });
    expect(preview!.facts[0]).toEqual({
      title: "Z kim pracuję",
      items: ["Dorośli"],
    });
    expect(preview!.photoUrl).toBe("https://signed/a?token=1");
  });

  it("the draft waiting for review, when asked; without a portrait, the photo", () => {
    const preview = profilePreview(
      detail({ displayName: "Anna Nowa", portraitPhotoUrl: null }),
      "draft",
    );
    expect(preview).toMatchObject({
      version: "draft",
      name: "Anna Nowa",
      portraitSrc: "https://signed/a?token=2",
    });
  });

  it("nothing published yet: the draft; nothing at all: none", () => {
    expect(
      profilePreview({ ...detail({}), publicProfile: null }, "published")
        ?.version,
    ).toBe("draft");
    expect(
      profilePreview(
        { ...detail({}), publicProfile: null, draft: null },
        "published",
      ),
    ).toBeNull();
  });
});
