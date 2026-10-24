// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { PublicWorkshop } from "@repo/supabase/workshops";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The homepage's coming workshops: the next two published, with the way to
// all of them, while the portal's switch ("Na stronie głównej") shows them;
// with none coming, or the switch off, nothing.

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
let onHome = true;
vi.mock("@/lib/workshop-data", () => ({
  getWorkshops: async () => workshops,
  getWorkshopVisibility: async () => ({ inMenu: true, onHome }),
  workshopImageUrl: (path: string) => path,
}));
vi.mock("@/lib/public-data", () => ({
  getBookingWindow: async () => ({ timeZone: "Europe/Warsaw" }),
}));

const { HomeWorkshops } = await import("./home-workshops");

beforeEach(() => {
  workshops = [];
  onHome = true;
});
afterEach(cleanup);

const open = async () => render(<>{await HomeWorkshops()}</>);
const section = () =>
  screen.queryByRole("region", { name: "Najbliższe warsztaty" });

describe("the homepage's workshops", () => {
  it("are the next two published, with the way to all of them", async () => {
    workshops = [
      workshop({
        id: "c",
        slug: "c",
        title: "Trzeci",
        startsAt: at(30),
        endsAt: at(30.1),
      }),
      workshop({
        id: "a",
        slug: "a",
        title: "Pierwszy",
        startsAt: at(5),
        endsAt: at(5.1),
      }),
      workshop({
        id: "x",
        slug: "x",
        title: "Odwołany",
        status: "cancelled",
        startsAt: at(3),
        endsAt: at(3.1),
      }),
      workshop({
        id: "b",
        slug: "b",
        title: "Drugi",
        startsAt: at(9),
        endsAt: at(9.1),
      }),
    ];
    await open();
    const shown = within(section()!);
    expect(shown.getByText("Pierwszy")).toBeVisible();
    expect(shown.getByText("Drugi")).toBeVisible();
    expect(shown.queryByText("Trzeci")).not.toBeInTheDocument();
    expect(shown.queryByText("Odwołany")).not.toBeInTheDocument();
    expect(
      shown.getByRole("link", { name: "Wszystkie warsztaty" }),
    ).toHaveAttribute("href", "/warsztaty");
  });

  it("are not there with none coming", async () => {
    await open();
    expect(section()).not.toBeInTheDocument();
  });

  it("are not there while the portal keeps them off the homepage", async () => {
    workshops = [workshop()];
    onHome = false;
    await open();
    expect(section()).not.toBeInTheDocument();
  });
});
