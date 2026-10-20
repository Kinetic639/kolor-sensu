// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  arrangeOffer,
  defaultClosingCta,
  defaultOfferPage,
  type OfferPageContent,
} from "@repo/contracts";
import { cleanup, render, screen, within } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// /oferta as a visitor gets it: the CMS's words, the services as tiles,
// each catalogue its own section with the menu's anchor, no questions (they
// are on Kontakt), and, with no service yet, never an empty page.

const service = (
  id: string,
  name: string,
  sortOrder: number,
  catalogId: string | null = null,
) => ({
  id,
  slug: id,
  name,
  publicTitle: null,
  shortDescription: `${name}: krótko.`,
  description: null,
  defaultDurationMinutes: 50,
  sortOrder,
  catalogId,
  icon: null,
});

const catalogs = [{ id: "firmy", name: "Dla firm", sortOrder: 1 }];
let services = [
  service("konsultacja", "Konsultacja", 0),
  service("warsztat-zespolu", "Warsztat dla zespołu", 0, "firmy"),
];
let words: OfferPageContent = defaultOfferPage;

vi.mock("@/lib/public-data", () => ({
  getOffer: async () => arrangeOffer(services, catalogs),
  getOfferPage: async () => words,
  getClosingCta: async () => defaultClosingCta,
}));

let Offer: () => Promise<React.ReactElement>;
beforeAll(async () => {
  ({ default: Offer } = (await import("./page")) as never);
}, 60_000);

beforeEach(() => {
  services = [
    service("konsultacja", "Konsultacja", 0),
    service("warsztat-zespolu", "Warsztat dla zespołu", 0, "firmy"),
  ];
  words = defaultOfferPage;
});
afterEach(cleanup);

const open = async () => render(await Offer());

describe("the offer page", () => {
  it("has the CMS's words at its top", async () => {
    words = {
      ...defaultOfferPage,
      intro: { ...defaultOfferPage.intro, heading: "Jak pomagamy" },
    };
    await open();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Jak pomagamy",
    );
  });

  it("shows each catalogue as its own section, at the menu's anchor", async () => {
    await open();
    const catalog = screen.getByRole("region", { name: "Dla firm" });
    expect(catalog).toHaveAttribute("id", "dla-firm");
    expect(within(catalog).getByText("Warsztat dla zespołu")).toBeVisible();
  });

  it("leads each tile to its service's page", async () => {
    await open();
    expect(screen.getByRole("link", { name: /Konsultacja/ })).toHaveAttribute(
      "href",
      "/oferta/konsultacja",
    );
  });

  it("has no questions: they are on Kontakt", async () => {
    await open();
    expect(
      screen.queryByRole("heading", { name: "Zanim się zapiszesz" }),
    ).not.toBeInTheDocument();
  });

  it("is never an empty page", async () => {
    services = [];
    await open();
    expect(screen.getByText(defaultOfferPage.emptyText)).toBeVisible();
  });
});
