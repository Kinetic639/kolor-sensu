// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { PublicWorkshop } from "@repo/supabase/workshops";
import {
  workshopDateLabel,
  workshopTimeLabel,
} from "@/features/workshops/workshop-view";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// A workshop's page beyond its header (the end-to-end test walks that): the
// cover and the description from the editor; "Dla kogo" and "Program",
// each only when filled in; the place, in person (place, address, room) or
// online (the link by e-mail, none on the page); the leaders, each to their
// profile; a draft or a wrong address is not found.

const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

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
    startsAt: at(10),
    endsAt: at(10.1),
    priceMinor: 15000,
    currencyCode: "PLN",
    capacity: 12,
    minParticipants: null,
    locationName: "Kolor Sensu",
    locationAddress: "ul. Spokojna 1, 00-001 Warszawa",
    locationDirections: null,
    locationCity: "Warszawa",
    roomName: "Sala duża",
    leaders: [
      {
        slug: "anna-nowak",
        name: "Anna Nowak",
        title: "Psycholożka",
        photoPath: null,
      },
      { slug: "ewa-lis", name: "Ewa Lis", title: null, photoPath: null },
    ],
    seatsLeft: 8,
    registrationOpen: true,
    confirmed: true,
    updatedAt: at(-10),
    ...patch,
  };
}

let picks = { serviceIds: [] as string[], articleIds: [] as string[] };
let found: PublicWorkshop | null = workshop();
let moved: string | null = null;
let others: PublicWorkshop[] = [];
let offers: { serviceName: string; serviceSlug: string }[] = [];
vi.mock("@/lib/workshop-data", () => ({
  getWorkshop: async () => found,
  getWorkshops: async () => (found ? [found, ...others] : others),
  getWorkshopRedirect: async () => moved,
  getWorkshopPicks: async () => picks,
  workshopImageUrl: (path: string) => `https://cdn.example.invalid/${path}`,
}));
vi.mock("@/lib/public-data", () => ({
  getBookingWindow: async () => ({ timeZone: "Europe/Warsaw" }),
  getSpecialistOffers: async () => offers,
  getWorkshopsPage: async () => ({ rules: ["Prosimy o punktualność."] }),
  getServices: async () => [
    { id: "s1", name: "Psychoterapia indywidualna", slug: "psychoterapia" },
    { id: "s2", name: "Konsultacja", slug: "konsultacja" },
  ],
  getSpecialists: async () => [
    {
      publicSlug: "anna-nowak",
      portraitUrl: "https://cdn.example.invalid/anna.jpg",
      photoUrl: null,
    },
    { publicSlug: "ewa-lis", portraitUrl: null, photoUrl: null },
  ],
}));
vi.mock("@/lib/education-data", () => ({
  getArticles: async () => [
    {
      id: "a1",
      slug: "czym-jest-lek",
      title: "Czym jest lęk",
      lead: "Krótko",
      coverPath: null,
      categoryId: null,
      authorKind: "team",
      authorSpecialistId: null,
      publishedAt: "2026-10-01T10:00:00Z",
      body: { type: "doc", content: [] },
      coverAlt: "",
    },
  ],
  getArticleCategories: async () => [],
  articleImageUrl: (path: string) => `https://cdn.example.invalid/${path}`,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  permanentRedirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

let generateMetadata: (props: {
  params: Promise<{ slug: string }>;
}) => Promise<Record<string, unknown>>;
let Workshop: (props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) => Promise<React.ReactElement>;
beforeAll(async () => {
  ({ default: Workshop, generateMetadata } = (await import("./page")) as never);
}, 60_000);

beforeEach(() => {
  found = workshop();
  picks = { serviceIds: [], articleIds: [] };
  others = [];
  offers = [];
});
afterEach(cleanup);

const open = async () =>
  render(
    await Workshop({
      params: Promise.resolve({ slug: "uwaznosc" }),
      searchParams: Promise.resolve({}),
    }),
  );

const text = (value: string) => ({ type: "text" as const, text: value });

describe("the description", () => {
  it("has the cover and the editor's text, its headings and lists", async () => {
    found = workshop({
      coverPath: "workshops/okladka.webp",
      coverAlt: "Krzesła w kręgu",
      body: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [text("O spotkaniu")],
          },
          { type: "paragraph", content: [text("Spokojnie i w grupie.")] },
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [text("Oddech")] }],
              },
            ],
          },
        ],
      },
    });
    await open();
    expect(screen.getByRole("img", { name: "Krzesła w kręgu" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "O spotkaniu" })).toBeVisible();
    expect(screen.getByText("Spokojnie i w grupie.")).toBeVisible();
    expect(screen.getByText("Oddech").closest("li")).toBeVisible();
  });

  it("has Dla kogo and Program when filled in", async () => {
    found = workshop({
      audience: "Dla rodziców nastolatków.",
      agenda: "- Powitanie\n- Ćwiczenia",
    });
    await open();
    expect(screen.getByRole("heading", { name: "Dla kogo" })).toBeVisible();
    expect(screen.getByText("Dla rodziców nastolatków.")).toBeVisible();
    const program = screen.getByRole("heading", { name: "Program" });
    expect(program.nextElementSibling).toHaveTextContent("PowitanieĆwiczenia");
  });

  it("leaves out Dla kogo and Program when empty", async () => {
    await open();
    expect(
      screen.queryByRole("heading", { name: "Dla kogo" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Program" }),
    ).not.toBeInTheDocument();
  });
});

describe("the place", () => {
  it("in person: the place, its address and the room", async () => {
    await open();
    expect(
      screen.getByText(
        "Kolor Sensu, ul. Spokojna 1, 00-001 Warszawa (Sala duża)",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/Link do spotkania/)).not.toBeInTheDocument();
  });

  it("online: the link comes by e-mail the day before, none on the page", async () => {
    found = workshop({ modality: "online" });
    await open();
    expect(screen.getByText("Online")).toBeVisible();
    expect(
      screen.getByText(
        "Link do spotkania wyślemy e-mailem dzień przed warsztatem.",
      ),
    ).toBeVisible();
  });
});

describe("the leaders", () => {
  it("are named, with their role, each to their profile", async () => {
    await open();
    expect(screen.getByRole("heading", { name: "Prowadzą" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Anna Nowak" })).toHaveAttribute(
      "href",
      "/specjalisci/anna-nowak",
    );
    expect(screen.getByText(/Psycholożka/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ewa Lis" })).toHaveAttribute(
      "href",
      "/specjalisci/ewa-lis",
    );
  });

  it("show the profile's photo, when there is one (#230)", async () => {
    const { container } = await open();
    const photos = [...container.querySelectorAll("img")].filter((img) =>
      decodeURIComponent(img.getAttribute("src") ?? "").includes("anna.jpg"),
    );
    expect(photos).toHaveLength(1);
    expect(container.querySelectorAll("li img")).toHaveLength(1);
  });
});

describe("the rules", () => {
  it("are the workshop's own, then the ones every workshop shares (#231)", async () => {
    await open();
    const rules = screen
      .getByRole("heading", { name: "Zasady" })
      .parentElement!.querySelectorAll("li");
    expect(rules[0]).toHaveTextContent(/pełny zwrot/);
    expect(rules[rules.length - 1]).toHaveTextContent(
      "Prosimy o punktualność.",
    );
  });
});

describe("Powiązane (#185)", () => {
  it("are the services and articles the admin picked", async () => {
    picks = { serviceIds: ["s2"], articleIds: ["a1"] };
    await open();
    expect(
      screen.getByRole("heading", { name: "Powiązane usługi" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Konsultacja" })).toHaveAttribute(
      "href",
      "/oferta/konsultacja",
    );
    expect(
      screen.queryByRole("link", { name: "Psychoterapia indywidualna" }),
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Warto przeczytać" }),
    ).toBeVisible();
    expect(screen.getByText("Czym jest lęk")).toBeVisible();
  });

  it("leave out what was not picked", async () => {
    await open();
    expect(
      screen.queryByRole("heading", { name: "Powiązane usługi" }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Warto przeczytać" }),
    ).toBeNull();
  });
});

describe("a draft or a wrong address", () => {
  it("is not found", async () => {
    found = null;
    moved = null;
    await expect(open()).rejects.toThrow("NOT_FOUND");
  });

  it("leads from an old address to the new one (#184)", async () => {
    found = null;
    moved = "uwaznosc-jesienia";
    await expect(open()).rejects.toThrow(
      "REDIRECT /warsztaty/uwaznosc-jesienia",
    );
    moved = null;
  });
});

describe("the header (#276)", () => {
  it("has the one H1, when, where, the price and the seats left", async () => {
    await open();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Uważność" }),
    ).toBeVisible();
    const when = `${workshopDateLabel(found!.startsAt, "Europe/Warsaw")}, ${workshopTimeLabel(found!.startsAt, found!.endsAt, "Europe/Warsaw")}`;
    expect(screen.getByText(when)).toBeVisible();
    // The price, as the site writes it (a no-break space before zł).
    expect(document.getElementById("zapis")).toHaveTextContent(/^150\szł/);
    expect(screen.getByText("Wolne: 8 miejsc z 12.")).toBeVisible();
  });

  it("says Potwierdzony or Czeka na komplet only with a minimum", async () => {
    await open();
    expect(screen.queryByText(/Potwierdzony|Czeka na komplet/)).toBeNull();
    cleanup();
    found = workshop({ minParticipants: 4, confirmed: true });
    await open();
    expect(screen.getByText(/· Potwierdzony/)).toBeVisible();
    cleanup();
    found = workshop({ minParticipants: 4, confirmed: false });
    await open();
    expect(screen.getByText(/· Czeka na komplet/)).toBeVisible();
  });
});

describe("the way there (#276)", () => {
  it("says how to get there and opens the maps", async () => {
    found = workshop({ locationDirections: "Wejście od podwórza." });
    await open();
    expect(screen.getByText("Wejście od podwórza.")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Otwórz w mapach/ }),
    ).toHaveAttribute("href", expect.stringContaining("google.com/maps"));
  });
});

describe("the rules' cases (#275)", () => {
  const rules = () =>
    screen.getByRole("heading", { name: "Zasady" }).parentElement!.textContent;

  it("say the minimum", async () => {
    found = workshop({ minParticipants: 3 });
    await open();
    expect(rules()).toMatch(/co najmniej 3 osoby/);
  });

  it("in the last week: pay at once, no full refund", async () => {
    found = workshop({ startsAt: at(3), endsAt: at(3.1) });
    await open();
    expect(rules()).toMatch(/mniej niż tydzień: płacisz od razu/);
    expect(rules()).not.toMatch(/pełny zwrot|zapłacić do/);
  });

  it("are not there once cancelled or over", async () => {
    found = workshop({ status: "cancelled", registrationOpen: false });
    await open();
    expect(screen.queryByRole("heading", { name: "Zasady" })).toBeNull();
    cleanup();
    found = workshop({
      status: "completed",
      startsAt: at(-2),
      endsAt: at(-1.9),
    });
    await open();
    expect(screen.queryByRole("heading", { name: "Zasady" })).toBeNull();
  });
});

describe("signing up, by the state (#276)", () => {
  const signup = () => document.getElementById("zapis")!;

  it("full: no seats, the waitlist instead", async () => {
    found = workshop({ seatsLeft: 0 });
    await open();
    expect(signup()).toHaveTextContent("Brak wolnych miejsc");
    expect(
      screen.getByRole("button", { name: "Zapisz się na listę rezerwową" }),
    ).toBeVisible();
  });

  it("closed, cancelled or over: why, and the way to ask", async () => {
    const cases: [Partial<PublicWorkshop>, string][] = [
      [{ registrationOpen: false }, "Zapisy są zamknięte."],
      [
        { status: "cancelled", registrationOpen: false },
        "Ten warsztat został odwołany.",
      ],
      [
        { status: "completed", startsAt: at(-2), endsAt: at(-1.9) },
        "Ten warsztat już się odbył.",
      ],
    ];
    for (const [patch, words] of cases) {
      found = workshop(patch);
      await open();
      expect(signup()).toHaveTextContent(words);
      expect(
        screen.getByRole("link", { name: "Zapytaj o kolejne terminy" }),
      ).toHaveAttribute("href", "/kontakt");
      expect(screen.queryByRole("button", { name: /Zapisz się/ })).toBeNull();
      cleanup();
    }
  });
});

describe("Powiązane without picks (#276)", () => {
  it("are the leader's services and the other coming workshops", async () => {
    offers = [{ serviceName: "Konsultacja", serviceSlug: "konsultacja" }];
    others = [
      workshop({
        id: "w2",
        slug: "oddech",
        title: "Oddech",
        startsAt: at(20),
        endsAt: at(20.1),
      }),
    ];
    await open();
    expect(
      screen.getByRole("heading", { name: "Indywidualnie: Anna Nowak" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Konsultacja" })).toHaveAttribute(
      "href",
      "/oferta/konsultacja",
    );
    expect(
      screen.getByRole("heading", { name: "Inne warsztaty" }),
    ).toBeVisible();
    expect(screen.getByText("Oddech")).toBeVisible();
  });
});

describe("Google and link previews (#276)", () => {
  const meta = () =>
    generateMetadata({ params: Promise.resolve({ slug: "uwaznosc" }) });

  it("use the workshop's SEO title and description, and its cover", async () => {
    found = workshop({
      seoTitle: "Uważność jesienią",
      seoDescription: "Dwie godziny w grupie.",
      coverPath: "workshops/okladka.webp",
      coverAlt: "Krzesła w kręgu",
    });
    expect(await meta()).toMatchObject({
      title: "Uważność jesienią",
      description: "Dwie godziny w grupie.",
      openGraph: {
        title: "Uważność jesienią",
        images: [
          {
            url: "https://cdn.example.invalid/workshops/okladka.webp",
            alt: "Krzesła w kręgu",
          },
        ],
      },
    });
  });

  it("fall back to the title, the short description and the list's picture", async () => {
    expect(await meta()).toMatchObject({
      title: "Uważność · Warsztaty",
      description: "Krótko",
      openGraph: { images: [{ url: "/warsztaty/opengraph-image" }] },
    });
  });
});
