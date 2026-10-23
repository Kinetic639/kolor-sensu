// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  defaultClosingCta,
  defaultRoomsPageContent,
  emptyRichTextDocument,
  type PublicLocation,
  type RoomsPageContent,
} from "@repo/contracts";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { RoomsPageLocation } from "@/lib/rooms-by-location";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// /gabinety as a visitor gets it: the CMS's words and switches, each
// location (address, description, amenities, accessibility) with its rooms,
// each room's photos and words; and, with no room yet, never an empty page.

const location = {
  id: "loc-1",
  name: "Kolor Sensu, Poznań",
  addressLine1: "ul. Długa 1",
  addressLine2: null,
  postalCode: "61-001",
  city: "Poznań",
  publicDescription: "Kamienica w centrum, drugie piętro.",
  amenities: ["Winda", "Poczekalnia"],
  accessibilityNotes: "Wejście bez progów, winda do drugiego piętra.",
  sortOrder: 0,
} as unknown as PublicLocation;

const room = (displayName: string, photos: number) => ({
  roomId: `room-${displayName}`,
  displayName,
  shortDescription: `${displayName}: jasny i cichy.`,
  longDescription: emptyRichTextDocument,
  photos: Array.from({ length: photos }, (_, index) => ({
    url: `/rooms/${displayName}-${index}.jpg`,
    alt: `${displayName}, zdjęcie ${index + 1}`,
  })),
});

let groups: RoomsPageLocation[] = [];
let locations: PublicLocation[] = [];
let content: RoomsPageContent = defaultRoomsPageContent;
vi.mock("@/lib/public-data", () => ({
  getRoomsByLocation: async () => groups,
  getLocations: async () => locations,
  getRoomsPageContent: async () => content,
  getClosingCta: async () => defaultClosingCta,
}));

let Rooms: () => Promise<React.ReactElement>;
beforeAll(async () => {
  ({ default: Rooms } = await import("./page"));
}, 60_000);

beforeEach(() => {
  groups = [
    {
      location,
      rooms: [room("Gabinet Zielony", 2), room("Gabinet Różowy", 0)],
    },
  ] as never;
  locations = [location];
  content = defaultRoomsPageContent;
});
afterEach(cleanup);

const open = async () => render(await Rooms());

describe("the page's words", () => {
  it("are the CMS's: the title, and the points of Co u nas znajdziesz", async () => {
    content = {
      ...defaultRoomsPageContent,
      intro: {
        ...defaultRoomsPageContent.intro,
        title: [[{ text: "Nasze gabinety", tone: "default" }]],
      },
      amenitiesHeading: "Na miejscu",
      amenities: ["Herbata i woda"],
    };
    await open();
    expect(
      screen
        .getAllByRole("heading", { level: 1 })
        .map((one) => one.textContent),
    ).toEqual([expect.stringContaining("Nasze gabinety")]);
    expect(
      screen.getByRole("heading", { name: "Na miejscu" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Herbata i woda")).toBeInTheDocument();
  });

  it("leave Co u nas znajdziesz out when switched off", async () => {
    content = { ...defaultRoomsPageContent, showAmenitiesSection: false };
    await open();
    expect(
      screen.queryByRole("heading", { name: "Co u nas znajdziesz" }),
    ).not.toBeInTheDocument();
  });
});

describe("a location and its rooms", () => {
  it("shows the address, description, amenities and accessibility", async () => {
    await open();
    const section = screen.getByRole("region", { name: "Kolor Sensu, Poznań" });
    expect(
      within(section).getByText(/ul\. Długa 1, 61-001 Poznań/),
    ).toBeInTheDocument();
    expect(
      within(section).getByText("Kamienica w centrum, drugie piętro."),
    ).toBeInTheDocument();
    expect(
      within(
        within(section).getByRole("list", { name: /Udogodnienia/ }),
      ).getAllByRole("listitem"),
    ).toHaveLength(2);
    expect(within(section).getByText(/Wejście bez progów/)).toBeInTheDocument();
  });

  it("shows each room with its words, and its photos when it has some", async () => {
    await open();
    const green = screen
      .getByRole("heading", { level: 3, name: "Gabinet Zielony" })
      .closest("article")!;
    expect(
      within(green).getByText("Gabinet Zielony: jasny i cichy."),
    ).toBeInTheDocument();
    expect(
      within(green).getByRole("region", { name: "Zdjęcia: Gabinet Zielony" }),
    ).toBeInTheDocument();

    const pink = screen
      .getByRole("heading", { level: 3, name: "Gabinet Różowy" })
      .closest("article")!;
    expect(
      within(pink).getByText("Gabinet Różowy: jasny i cichy."),
    ).toBeInTheDocument();
    expect(within(pink).queryByRole("region")).not.toBeInTheDocument();
  });

  it("lists the rooms as the page's sections when location details are off", async () => {
    content = { ...defaultRoomsPageContent, showLocationDetails: false };
    await open();
    expect(
      screen.queryByRole("heading", { name: "Kolor Sensu, Poznań" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Gabinet Zielony" }),
    ).toBeInTheDocument();
  });
});

describe("no room yet", () => {
  it("shows the locations and says the rooms are coming", async () => {
    groups = [];
    await open();
    expect(
      screen.getByText(defaultRoomsPageContent.emptyText),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Kolor Sensu, Poznań" }),
    ).toBeInTheDocument();
  });

  it("still says so with the location details off, never an empty page", async () => {
    groups = [];
    content = { ...defaultRoomsPageContent, showLocationDetails: false };
    await open();
    expect(
      screen.getByText(defaultRoomsPageContent.emptyText),
    ).toBeInTheDocument();
  });
});

describe("the end of the page", () => {
  it("leads to booking and to Kontakt", async () => {
    await open();
    expect(screen.getByRole("link", { name: /Umów wizytę/ })).toHaveAttribute(
      "href",
      "/umow-wizyte",
    );
    expect(
      screen.getByRole("link", { name: "Skontaktuj się" }),
    ).toHaveAttribute("href", "/kontakt");
  });
});
