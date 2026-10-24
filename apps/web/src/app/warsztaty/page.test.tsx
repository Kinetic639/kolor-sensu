// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { defaultClosingCta } from "@repo/contracts";
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

// Warsztaty as a visitor sees them: the coming ones; a cancelled one with
// its label until its day, then gone from the page; with none coming, the
// word and "Zapytaj o najbliższe terminy" to Kontakt.

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
    leaders: [],
    seatsLeft: 8,
    registrationOpen: true,
    confirmed: true,
    updatedAt: at(-10),
    ...patch,
  };
}

let workshops: PublicWorkshop[] = [];
vi.mock("@/lib/workshop-data", () => ({
  getWorkshops: async () => workshops,
  workshopImageUrl: (path: string) => path,
}));
vi.mock("@/lib/public-data", () => ({
  getBookingWindow: async () => ({ timeZone: "Europe/Warsaw" }),
  getClosingCta: async () => defaultClosingCta,
  getWatercolorLook: async () => ({}),
}));
vi.mock("@/lib/page-metadata", () => ({ pageMetadata: async () => ({}) }));

let Workshops: (props: {
  searchParams: Promise<Record<string, string>>;
}) => Promise<React.ReactElement>;
beforeAll(async () => {
  ({ default: Workshops } = (await import("./page")) as never);
}, 60_000);

beforeEach(() => {
  workshops = [];
});
afterEach(cleanup);

const open = async (searchParams: Record<string, string> = {}) =>
  render(await Workshops({ searchParams: Promise.resolve(searchParams) }));

const coming = () =>
  screen.getByRole("region", { name: "Nadchodzące warsztaty" });

describe("Warsztaty with none coming", () => {
  it("says so and leads to Kontakt to ask about the next dates", async () => {
    await open();
    expect(
      within(coming()).getByText(/nie mamy zaplanowanych wydarzeń/),
    ).toBeVisible();
    expect(
      within(coming()).getByRole("link", {
        name: "Zapytaj o najbliższe terminy",
      }),
    ).toHaveAttribute("href", "/kontakt");
    expect(
      screen.queryByRole("navigation", { name: "Forma warsztatów" }),
    ).not.toBeInTheDocument();
  });
});

describe("a cancelled workshop", () => {
  it("is labelled Odwołany until its day", async () => {
    workshops = [workshop({ status: "cancelled", registrationOpen: false })];
    await open();
    expect(within(coming()).getByText("Uważność")).toBeVisible();
    expect(within(coming()).getByText("Odwołany")).toBeVisible();
  });

  it("is gone from the page once its day is over", async () => {
    workshops = [
      workshop({
        status: "cancelled",
        registrationOpen: false,
        startsAt: at(-2),
        endsAt: at(-1.9),
      }),
    ];
    await open();
    expect(screen.queryByText("Uważność")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Minione warsztaty" }),
    ).not.toBeInTheDocument();
  });
});

describe("the form filter", () => {
  it("shows the coming ones of that form, and the way back to all", async () => {
    workshops = [workshop()];
    await open({ forma: "online" });
    expect(within(coming()).queryByText("Uważność")).not.toBeInTheDocument();
    expect(
      within(coming()).getByRole("link", { name: "Pokaż wszystkie" }),
    ).toHaveAttribute("href", "/warsztaty");
  });
});
