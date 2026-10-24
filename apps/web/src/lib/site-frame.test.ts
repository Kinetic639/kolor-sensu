import { beforeEach, describe, expect, it, vi } from "vitest";

// The site's frame: the menu shows Warsztaty while the portal's switch
// says so ("W menu strony"), and the footer's contact hours are the CMS's
// (Ustawienia wspólne, #23), not the site's own.

let inMenu = true;
let hours: string | null = "pon.–pt. 9:00–20:00";
vi.mock("@/lib/public-data", () => ({
  getCenter: async () => ({
    publicPhone: "+48 61 123 45 67",
    publicEmail: "kontakt@example.invalid",
    shortDescription: null,
    instagramUrl: null,
    facebookUrl: null,
  }),
  getLocations: async () => [
    {
      addressLine1: "ul. Testowa 1",
      addressLine2: null,
      postalCode: "60-001",
      city: "Poznań",
    },
  ],
  getServices: async () => [],
  getOffer: async () => [],
  getAnnouncement: async () => null,
  getCompany: async () => null,
  getSiteContact: async () => ({ hours }),
}));
vi.mock("@/lib/education-data", () => ({
  getArticles: async () => [],
  getEbooks: async () => [],
}));
vi.mock("./workshop-data", () => ({
  getWorkshopVisibility: async () => ({ inMenu, onHome: true }),
}));

const { getSiteFrame } = await import("./site-frame");

beforeEach(() => {
  inMenu = true;
  hours = "pon.–pt. 9:00–20:00";
});

const labels = async () =>
  (await getSiteFrame()).navigation.map((item) => item.label);

describe("the menu", () => {
  it("has Warsztaty while the portal shows them", async () => {
    expect(await labels()).toEqual([
      "O nas",
      "Oferta",
      "Warsztaty",
      "Edukacja",
    ]);
  });

  it("leaves Warsztaty out once the portal hides them", async () => {
    inMenu = false;
    expect(await labels()).toEqual(["O nas", "Oferta", "Edukacja"]);
  });
});

describe("the footer's contact", () => {
  it("has the address, the phone as dialled and the CMS's hours", async () => {
    expect((await getSiteFrame()).contact).toEqual({
      address: {
        street: "ul. Testowa 1",
        postalCode: "60-001",
        city: "Poznań",
      },
      phone: "+48611234567",
      phoneLabel: "+48 61 123 45 67",
      email: "kontakt@example.invalid",
      hours: "pon.–pt. 9:00–20:00",
    });
  });

  it("has no hours while the CMS has none", async () => {
    hours = null;
    expect((await getSiteFrame()).contact).not.toHaveProperty("hours");
  });
});
