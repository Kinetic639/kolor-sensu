// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { PublicWorkshop } from "@repo/supabase/workshops";
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

let found: PublicWorkshop | null = workshop();
vi.mock("@/lib/workshop-data", () => ({
  getWorkshop: async () => found,
  workshopImageUrl: (path: string) => `https://cdn.example.invalid/${path}`,
}));
vi.mock("@/lib/public-data", () => ({
  getBookingWindow: async () => ({ timeZone: "Europe/Warsaw" }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

let Workshop: (props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) => Promise<React.ReactElement>;
beforeAll(async () => {
  ({ default: Workshop } = (await import("./page")) as never);
}, 60_000);

beforeEach(() => {
  found = workshop();
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
});

describe("a draft or a wrong address", () => {
  it("is not found", async () => {
    found = null;
    await expect(open()).rejects.toThrow("NOT_FOUND");
  });
});
