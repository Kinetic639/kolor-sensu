// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
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

// A specialist's profile as a visitor gets it: the photo, role, words and
// facts, their services with prices, "Umów" with them (only while they take
// new clients, #63), the way back to everyone, and their data for Google;
// an address since changed sends on, an unknown one is "not found".

const anna = {
  specialistId: "6f1c2b9a-3c41-4e2b-9a55-0d3f2a7b8c10",
  publicSlug: "anna-nowak",
  displayName: "Anna Nowak",
  professionalTitle: "Psychoterapeutka",
  shortBio: "Pracuję z dorosłymi.",
  longBio: null,
  specializations: ["lęk"],
  therapyApproaches: [],
  clientGroups: ["adults"],
  modalities: ["in_person"],
  languages: ["polski"],
  education: ["Psychologia, UAM"],
  certificates: [],
  active: true,
  portraitUrl: "https://cdn.test/anna.png",
  photoUrl: null,
};

const offer = {
  serviceId: "s1",
  serviceName: "Konsultacja psychologiczna",
  serviceSlug: "konsultacja-psychologiczna",
  effectiveDurationMinutes: 50,
  priceMinor: 20000,
  currencyCode: "PLN",
  supportsInPerson: true,
  supportsOnline: false,
};

let found: typeof anna | null = anna;
let movedTo: string | null = null;
let offerless = false;
vi.mock("@/lib/education-data", () => ({
  getArticles: async () => [],
  getServiceArticles: async () => [],
  getArticleCategories: async () => [],
  articleImageUrl: (path: string) => path,
}));
vi.mock("@/lib/public-data", () => ({
  getSpecialist: async () => found,
  getSpecialists: async () => (found ? [found] : []),
  getSpecialistOffers: async () => (found && !offerless ? [offer] : []),
  getSpecialistRedirect: async () => movedTo,
}));

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  permanentRedirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

let Profile: (props: {
  params: Promise<{ slug: string }>;
}) => Promise<React.ReactElement>;
beforeAll(async () => {
  ({ default: Profile } = (await import("./page")) as never);
}, 60_000);

beforeEach(() => {
  found = anna;
  movedTo = null;
  offerless = false;
});
afterEach(cleanup);

const open = async (slug = "anna-nowak") =>
  render(await Profile({ params: Promise.resolve({ slug }) }));

describe("a published profile", () => {
  it("shows the person, their words and qualifications", async () => {
    await open();
    expect(
      screen.getByRole("heading", { level: 1, name: /Anna Nowak/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Pracuję z dorosłymi.").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Psychologia, UAM")).toBeInTheDocument();
    expect(
      screen.getAllByRole("img", { name: /Anna Nowak/ }).length,
    ).toBeGreaterThan(0);
  });

  it("lists their services, each to its page, with time and price", async () => {
    await open();
    const offers = screen.getByRole("region", { name: "Usługi i ceny" });
    expect(
      within(offers).getByRole("link", { name: /Konsultacja psychologiczna/ }),
    ).toHaveAttribute("href", "/oferta/konsultacja-psychologiczna");
    expect(within(offers).getByText(/50 min/)).toBeInTheDocument();
    expect(within(offers).getByText(/200/)).toBeInTheDocument();
  });

  it("books with them, and leads back to everyone", async () => {
    await open();
    expect(screen.getByRole("link", { name: /Umów wizytę/ })).toHaveAttribute(
      "href",
      expect.stringContaining("specjalista=anna-nowak"),
    );
    expect(
      screen.getByRole("link", { name: "Wszyscy specjaliści" }),
    ).toHaveAttribute("href", "/specjalisci");
  });

  it("says, instead of booking, when they take no new clients (#63)", async () => {
    found = { ...anna, active: false };
    await open();
    expect(
      screen.queryByRole("link", { name: /Umów wizytę/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Obecnie nie przyjmuje nowych osób."),
    ).toBeInTheDocument();
  });

  it("gives Google the person, with a lasting address for the photo", async () => {
    const { container } = await open();
    const data = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!
        .textContent!,
    );
    expect(data).toMatchObject({
      "@type": "Person",
      name: "Anna Nowak",
      jobTitle: "Psychoterapeutka",
      image: expect.stringMatching(/\/specjalisci\/anna-nowak\/zdjecie$/),
    });
  });
});

describe("a profile with parts missing", () => {
  it("shows a stand-in portrait and leaves out what is empty", async () => {
    found = {
      ...anna,
      portraitUrl: null,
      photoUrl: null,
      education: [],
      certificates: [],
    } as never;
    offerless = true;
    await open();
    expect(
      screen.getAllByRole("img", { name: /Anna Nowak/ })[0],
    ).toHaveAttribute("src", expect.stringContaining("specjalista.svg"));
    expect(
      screen.queryByRole("heading", { name: "Wykształcenie i kwalifikacje" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Usługi i ceny" }),
    ).not.toBeInTheDocument();
  });
});

describe("an address that is not a profile", () => {
  it("sends a changed address on, for good", async () => {
    found = null;
    movedTo = "anna-kowalska";
    await expect(open("anna-nowak")).rejects.toThrow(
      "REDIRECT /specjalisci/anna-kowalska",
    );
  });

  it("is not found otherwise", async () => {
    found = null;
    await expect(open("nikt")).rejects.toThrow("NOT_FOUND");
  });
});
