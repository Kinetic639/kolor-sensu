// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  defaultAboutHeaders,
  defaultAboutPage,
  defaultClosingCta,
  type AboutPageContent,
} from "@repo/contracts";
import type { SiteContact } from "@repo/ui/public-site";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { SpecialistWithMedia } from "@/lib/public-data";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// O nas as a visitor gets it, with what the CMS publishes stood in for: each
// loader returns the site's own content unless a test publishes otherwise.

const contact: SiteContact = {
  address: { street: "ul. Testowa 1", postalCode: "00-001", city: "Warszawa" },
  phone: "+48 600 000 000",
  email: "kontakt@example.invalid",
  hours: "Pn–Pt 8:00–20:00",
};

const person = (displayName: string, index: number) =>
  ({
    specialistId: `00000000-0000-4000-8000-00000000000${index}`,
    publicSlug: `osoba-${index}`,
    displayName,
    professionalTitle: "Psychoterapeutka",
    shortBio: "Pracuję z dorosłymi.",
    specializations: [],
    clientGroups: [],
    modalities: [],
    active: true,
    portraitUrl: "https://cdn.test/portrait.png",
    photoUrl: null,
  }) as unknown as SpecialistWithMedia;

const sitesOwn = () => ({
  about: { ...defaultAboutPage, storyImageUrl: null } as AboutPageContent & {
    storyImageUrl: string | null;
  },
  center: null as { shortDescription: string | null } | null,
  specialists: [] as SpecialistWithMedia[],
  contact: contact as SiteContact | undefined,
});
let published = sitesOwn();

vi.mock("@/lib/public-data", () => ({
  getAboutPage: async () => published.about,
  getAboutHeaders: async () => defaultAboutHeaders,
  getCenter: async () => published.center,
  getSpecialists: async () => published.specialists,
  getWatercolorLook: async () => ({}),
  getClosingCta: async () => defaultClosingCta,
}));

vi.mock("@/lib/site-frame", () => ({
  getSiteFrame: async () => ({ contact: published.contact }),
}));

let About: () => Promise<React.ReactElement>;
beforeAll(async () => {
  ({ default: About } = await import("./page"));
}, 60_000);

beforeEach(() => {
  published = sitesOwn();
});
afterEach(cleanup);

const renderAbout = async () => render(await About());
const region = (name: string) => screen.queryByRole("region", { name });

describe("the top", () => {
  it("is the page's one h1, with the CMS's words", async () => {
    published.about = {
      ...published.about,
      intro: {
        ...defaultAboutPage.intro,
        title: [[{ text: "Kim jesteśmy", tone: "default" }]],
      },
    };
    await renderAbout();
    expect(
      screen
        .getAllByRole("heading", { level: 1 })
        .map((one) => one.textContent),
    ).toEqual([expect.stringContaining("Kim jesteśmy")]);
  });

  it("takes its lead from the CMS, else the centre's description, else the site's", async () => {
    published.center = { shortDescription: "Opis z ustawień centrum." };
    await renderAbout();
    expect(screen.getByText("Opis z ustawień centrum.")).toBeInTheDocument();
    cleanup();

    published.about = {
      ...published.about,
      intro: {
        ...defaultAboutPage.intro,
        description: [{ text: "Opis z CMS.", link: null }],
      },
    };
    await renderAbout();
    expect(screen.getByText("Opis z CMS.")).toBeInTheDocument();
    cleanup();

    published = sitesOwn();
    await renderAbout();
    expect(screen.getByText(/Kolor Sensu to miejsce/)).toBeInTheDocument();
  });
});

describe("Nasza historia", () => {
  it("shows only once switched on, and only with its words", async () => {
    await renderAbout();
    expect(region("Skąd się wzięliśmy")).not.toBeInTheDocument();
    cleanup();

    published.about = {
      ...published.about,
      showStory: true,
      story: {
        text: "Zaczęło się od rozmowy.",
        imagePath: "about/a.webp",
        imageAlt: "Zespół przy stole",
      },
      storyImageUrl: "https://cdn.test/about.webp",
    };
    await renderAbout();
    const story = region("Skąd się wzięliśmy")!;
    expect(
      within(story).getByText("Zaczęło się od rozmowy."),
    ).toBeInTheDocument();
    expect(
      within(story).getByRole("img", { name: "Zespół przy stole" }),
    ).toBeInTheDocument();
    cleanup();

    published.about = {
      ...published.about,
      story: { text: " ", imagePath: null, imageAlt: "" },
    };
    await renderAbout();
    expect(region("Skąd się wzięliśmy")).not.toBeInTheDocument();
  });
});

describe("the values", () => {
  it("are three cards, the concrete facts under the last only once switched on", async () => {
    published.about = {
      ...published.about,
      professionalism: ["Superwizja", "Kodeks etyczny PTP"],
    };
    await renderAbout();
    const values = screen.getByRole("heading", { name: "Nasze wartości" })
      .nextElementSibling as HTMLElement;
    expect(within(values).getByText("Bezpieczeństwo")).toBeInTheDocument();
    expect(within(values).getByText("Profesjonalizm")).toBeInTheDocument();
    expect(screen.queryByText("Superwizja")).not.toBeInTheDocument();
    cleanup();

    published.about = { ...published.about, showProfessionalism: true };
    await renderAbout();
    const facts = screen.getByRole("list", {
      name: "Profesjonalizm: konkretnie",
    });
    expect(within(facts).getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("Z kim pracujemy", () => {
  it("shows its cards once switched on, each leading to the offer", async () => {
    await renderAbout();
    expect(region("Wsparcie na różnych etapach życia")).not.toBeInTheDocument();
    cleanup();

    published.about = { ...published.about, showAudiences: true };
    await renderAbout();
    const section = region("Wsparcie na różnych etapach życia")!;
    for (const title of ["Dorośli", "Pary", "Dzieci i młodzież"]) {
      expect(
        within(section).getByRole("link", { name: new RegExp(title) }),
      ).toHaveAttribute("href", "/oferta");
    }
    expect(
      within(section).getByText("Spotkania stacjonarnie i online."),
    ).toBeInTheDocument();
  });
});

describe("the team and the rooms", () => {
  it("shows the first three specialists, before the rooms, each section leading on", async () => {
    published.specialists = ["Anna", "Basia", "Celina", "Dorota"].map(person);
    await renderAbout();
    const team = region("Poznaj nasz zespół")!;
    expect(within(team).getByText("Celina")).toBeInTheDocument();
    expect(within(team).queryByText("Dorota")).not.toBeInTheDocument();
    expect(
      within(team).getByRole("link", {
        name: /Zobacz wszystkich specjalistów/,
      }),
    ).toHaveAttribute("href", "/specjalisci");

    const rooms = screen.getByRole("link", { name: /Zobacz nasze gabinety/ });
    expect(rooms).toHaveAttribute("href", "/gabinety");
    expect(
      team.compareDocumentPosition(rooms) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("leaves the team out while nobody is on the site", async () => {
    await renderAbout();
    expect(region("Poznaj nasz zespół")).not.toBeInTheDocument();
  });
});

describe("Kontakt", () => {
  it("shows the company's details with a link to Kontakt, and is left out without them", async () => {
    await renderAbout();
    const section = region("Jesteśmy blisko")!;
    expect(within(section).getByText(/ul\. Testowa 1/)).toBeInTheDocument();
    expect(
      within(section).getByRole("link", { name: /Przejdź do kontaktu/ }),
    ).toHaveAttribute("href", "/kontakt");
    cleanup();

    published.contact = undefined;
    await renderAbout();
    expect(region("Jesteśmy blisko")).not.toBeInTheDocument();
  });
});

describe("the closing banner", () => {
  it("leads to booking and to Kontakt", async () => {
    await renderAbout();
    const banner = screen
      .getByRole("heading", { name: defaultClosingCta.heading })
      .closest("section, div")!.parentElement!;
    expect(
      within(banner).getByRole("link", { name: /Umów wizytę/ }),
    ).toHaveAttribute("href", "/umow-wizyte");
    expect(
      within(banner).getByRole("link", { name: "Skontaktuj się" }),
    ).toHaveAttribute("href", "/kontakt");
  });
});
