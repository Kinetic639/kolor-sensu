// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { emptyArticleDocument } from "@repo/contracts/article-rich-text";
import type { PublishedArticle } from "@repo/contracts/education";
import { defaultServicePage } from "@repo/contracts";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// A service's page. Booked online: "Umów wizytę" opens the wizard with this
// service chosen (#94), and its prices show. Not booked online (no
// specialist offers it, or its online booking is off): the price is agreed
// and "Zadzwoń / napisz" leads to Kontakt. "Jak pracujemy" has the CMS's
// words, and "Umów pierwsze spotkanie" the first-visit consultation. Google
// gets the service, with its prices only while they show; the articles
// linked to it are under "Warto przeczytać".

const therapy = {
  id: "s2",
  slug: "terapia-par",
  name: "Terapia par",
  publicTitle: null,
  shortDescription: "Dla par.",
  description: null,
  defaultDurationMinutes: 80,
};

const offer = {
  serviceId: "s2",
  serviceName: "Terapia par",
  serviceSlug: "terapia-par",
  specialistPublicSlug: "anna-nowak",
  specialistProfessionalTitle: null,
  priceMinor: 25000,
  currencyCode: "PLN",
  effectiveDurationMinutes: 80,
  supportsInPerson: true,
  supportsOnline: false,
};

let bookable = true;
let offers = [offer];
let words = defaultServicePage;
let service: typeof therapy | null = therapy;
let intake = new Set(["konsultacja-psychologiczna"]);
let articles: PublishedArticle[] = [];
vi.mock("@/lib/education-data", () => ({
  getArticles: async () => [],
  getServiceArticles: async () => articles,
  getArticleCategories: async () => [],
  articleImageUrl: (path: string) => path,
}));
vi.mock("@/lib/public-data", () => ({
  getService: async () => service,
  getServices: async () => (service ? [service] : []),
  getServiceOffers: async () => offers,
  getSpecialists: async () => [
    { publicSlug: "anna-nowak", displayName: "Anna Nowak" },
  ],
  getWatercolorLook: async () => ({}),
  getIntakeServiceSlugs: async () => intake,
  getServicePage: async () => words,
  getBookableCatalog: async () => ({
    services: bookable && service ? [service] : [],
    offers: [],
  }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

let Service: (props: {
  params: Promise<{ slug: string }>;
}) => Promise<React.ReactElement>;
beforeAll(async () => {
  ({ default: Service } = (await import("./page")) as never);
}, 60_000);

beforeEach(() => {
  service = therapy;
  bookable = true;
  offers = [offer];
  words = defaultServicePage;
  intake = new Set(["konsultacja-psychologiczna"]);
  articles = [];
});
afterEach(cleanup);

const open = async () =>
  render(await Service({ params: Promise.resolve({ slug: "terapia-par" }) }));

/** The page's data for Google about the service. */
function serviceData(container: HTMLElement) {
  return [...container.querySelectorAll('script[type="application/ld+json"]')]
    .map((script) => JSON.parse(script.textContent ?? "{}"))
    .find((data) => data["@type"] === "Service");
}

describe("a service booked online", () => {
  it("opens the wizard with this service chosen, its price shown", async () => {
    await open();
    expect(screen.getByRole("link", { name: /Umów wizytę/ })).toHaveAttribute(
      "href",
      "/umow-wizyte?usluga=terapia-par",
    );
    expect(screen.getAllByText(/250/).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("link", { name: /Zadzwoń \/ napisz/ }),
    ).not.toBeInTheDocument();
  });

  it("opens the first meeting with the first-visit consultation", async () => {
    await open();
    expect(
      screen.getByRole("link", { name: /Umów pierwsze spotkanie/ }),
    ).toHaveAttribute("href", "/umow-wizyte?usluga=konsultacja-psychologiczna");
  });
});

describe("a service not booked online", () => {
  for (const [why, setUp] of [
    ["its online booking is off", () => (bookable = false)],
    ["no specialist offers it", () => (offers = [])],
  ] as const) {
    it(`asks to call or write when ${why}, with no price`, async () => {
      setUp();
      await open();
      expect(
        screen.queryByRole("link", { name: /Umów wizytę/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Zadzwoń \/ napisz/ }),
      ).toHaveAttribute("href", "/kontakt");
      expect(screen.getByText("Cena ustalana indywidualnie")).toBeVisible();
      expect(screen.queryByText(/250/)).not.toBeInTheDocument();
    });
  }
});

describe("the service page's words", () => {
  it("are the CMS's: Jak pracujemy and the line for no booking", async () => {
    words = {
      howWeWork: {
        eyebrow: "Nasz sposób",
        heading: "Rozmowa w Twoim tempie",
        description: "Krótki opis.",
        ctaLabel: "Zacznij od konsultacji",
      },
      unbooked: { priceText: "Cena do ustalenia", contactLabel: "Napisz" },
    };
    bookable = false;
    await open();
    expect(
      screen.getByRole("heading", { name: "Rozmowa w Twoim tempie" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Zacznij od konsultacji/ }),
    ).toBeVisible();
    expect(screen.getByText("Cena do ustalenia")).toBeVisible();
    expect(screen.getByRole("link", { name: /^Napisz/ })).toHaveAttribute(
      "href",
      "/kontakt",
    );
  });
});

describe("a hidden service or a wrong address", () => {
  it("is not found", async () => {
    service = null;
    await expect(open()).rejects.toThrow("NOT_FOUND");
  });
});

describe("the service's data for Google", () => {
  it("names the service, with its prices while booked online", async () => {
    const { container } = await open();
    expect(serviceData(container)).toMatchObject({
      name: "Terapia par",
      description: "Dla par.",
      url: expect.stringMatching(/\/oferta\/terapia-par$/),
      offers: [{ "@type": "Offer", price: 250, priceCurrency: "PLN" }],
    });
  });

  it("has no prices when the price is agreed", async () => {
    bookable = false;
    const { container } = await open();
    expect(serviceData(container).name).toBe("Terapia par");
    expect(serviceData(container)).not.toHaveProperty("offers");
  });
});

describe("the articles linked to the service", () => {
  it("are under Warto przeczytać, each to its page", async () => {
    articles = [
      {
        id: "a1",
        slug: "jak-rozmawiac",
        title: "Jak rozmawiać w parze",
        lead: "Wstęp",
        coverPath: "",
        coverAlt: "",
        categoryId: "c1",
        body: emptyArticleDocument,
        authorKind: "team",
        authorSpecialistId: null,
        reviewerSpecialistId: null,
        sources: [],
        ebookId: null,
        seoTitle: "",
        seoDescription: "",
        ogImagePath: null,
        publishedAt: "2026-10-21T10:00:00Z",
        contentUpdatedAt: "2026-10-21T10:00:00Z",
      },
    ];
    await open();
    const section = screen.getByRole("region", { name: "Warto przeczytać" });
    expect(
      within(section).getByRole("link", { name: /Jak rozmawiać w parze/ }),
    ).toHaveAttribute("href", "/edukacja/artykuly/jak-rozmawiac");
  });

  it("are left out when there are none", async () => {
    await open();
    expect(
      screen.queryByRole("region", { name: "Warto przeczytać" }),
    ).not.toBeInTheDocument();
  });
});
