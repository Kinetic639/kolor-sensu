// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  defaultClosingCta,
  defaultCrisisHelp,
  defaultFirstSteps,
  defaultHomeHeaders,
  defaultHomeLocation,
  defaultHomeSections,
  defaultHomeStory,
  defaultHomeThoughts,
  homePageContentSchema,
  defaultNewsletterBand,
  defaultWhyUs,
  type CrisisHelpContent,
  type FirstStepsContent,
  type HomeLocationContent,
  type HomeThoughtsContent,
  type NewsletterBandContent,
  type WhyUsContent,
} from "@repo/contracts";
import type { PublicSupportArea } from "@repo/supabase";
import type { SiteContact, WatercolorLook } from "@repo/ui/public-site";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { HomeHero, HomeStory } from "@/lib/home-content";
import type { RoomsPageLocation } from "@/lib/rooms-by-location";
import type { HomeSections } from "@/lib/spotlight";
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

// The homepage as a visitor gets it, with what the CMS publishes stood in
// for: each loader returns the site's own content (as before anything is
// published) unless a test publishes something else.
const contact: SiteContact = {
  address: { street: "ul. Testowa 1", postalCode: "00-001", city: "Warszawa" },
  phone: "+48 600 000 000",
  email: "kontakt@example.invalid",
  hours: "Pn–Pt 8:00–20:00",
} as SiteContact;

const sitesOwn = () => ({
  whyUs: defaultWhyUs as WhyUsContent,
  newsletter: defaultNewsletterBand as NewsletterBandContent,
  location: defaultHomeLocation as HomeLocationContent,
  crisis: defaultCrisisHelp as CrisisHelpContent,
  supportAreas: null as PublicSupportArea[] | null,
  firstSteps: defaultFirstSteps as FirstStepsContent,
  sections: { ...defaultHomeSections, spotlightImage: null } as HomeSections,
  specialists: [] as SpecialistWithMedia[],
  contact: contact as SiteContact | undefined,
  hero: null as HomeHero | null,
  rooms: [] as RoomsPageLocation[],
  thoughts: defaultHomeThoughts as HomeThoughtsContent,
  story: {
    steps: defaultHomeStory.steps.map((step) => ({ ...step, imageUrl: null })),
  } as HomeStory,
  watercolor: {} as WatercolorLook,
});
let published = sitesOwn();

vi.mock("@/lib/public-data", () => ({
  getHomeContent: async () => published.hero,
  getClosingCta: async () => defaultClosingCta,
  getRoomsByLocation: async () => published.rooms,
  getHomeThoughts: async () => published.thoughts,
  getHomeStory: async () => published.story,
  getHomeHeaders: async () => defaultHomeHeaders,
  getSupportAreas: async () => published.supportAreas,
  getFirstSteps: async () => published.firstSteps,
  getHomeSections: async () => published.sections,
  getSpecialists: async () => published.specialists,
  getWhyUs: async () => published.whyUs,
  getNewsletterBand: async () => published.newsletter,
  getHomeLocation: async () => published.location,
  getCrisisHelp: async () => published.crisis,
  getWatercolorLook: async () => published.watercolor,
  getCompany: async () => ({ legalName: "Kolor Sensu sp. z o.o." }),
}));

// The sign-up form stands in (its own test: newsletter-signup.test.tsx).
vi.mock("@/features/newsletter/newsletter-signup", () => ({
  NewsletterSignup: ({ controller }: { controller: string }) => (
    <form aria-label={`Zapis na newsletter (${controller})`} />
  ),
}));

vi.mock("@/lib/site-frame", () => ({
  getSiteFrame: async () => ({ contact: published.contact }),
}));

beforeAll(() => {
  // Sections animate as they scroll into view.
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  } as unknown as typeof IntersectionObserver;
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

beforeEach(() => {
  published = sitesOwn();
});

afterEach(cleanup);

// The page pulls in every section of the site: imported once, up front.
let Home: () => Promise<React.JSX.Element>;
beforeAll(async () => {
  ({ default: Home } = await import("./page"));
}, 60_000);

async function renderHome() {
  render(await Home());
}

const title = (name: string) => screen.queryByRole("heading", { name });

describe("the homepage", () => {
  it("has no questions and answers: they live on Kontakt", async () => {
    await renderHome();
    expect(
      screen.queryByRole("heading", { name: /Zanim się zobaczymy/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Jak wygląda pierwsza wizyta?"),
    ).not.toBeInTheDocument();
  });

  it("paints the hero picture in, its photo shown at once on a phone", async () => {
    const { container } = render(await Home());
    const hero = container.querySelector("section .ks-wc");
    expect(hero).toHaveAttribute("data-animation", "watercolor-reveal");
    expect(hero).toHaveAttribute("data-photo-at-once", "narrow");
  });

  it("paints its pictures with the backdrop and parallax layer the admin chose", async () => {
    published.watercolor = {
      watercolorSrc: "/media/backdrop.webp",
      parallaxSrc: "/media/drops.png",
    };
    const { container } = render(await Home());
    const pictures = container.querySelectorAll(".ks-wc");
    expect(pictures.length).toBeGreaterThan(1);
    for (const picture of pictures) {
      expect(
        picture.querySelector(".ks-wc__backdrop img")?.getAttribute("src"),
      ).toContain("backdrop.webp");
      expect(
        picture.querySelector(".ks-wc__parallax img")?.getAttribute("src"),
      ).toContain("drops.png");
    }
  });

  it("shows its sections in the agreed order, every one switched on", async () => {
    published.whyUs = { ...defaultWhyUs, visible: true };
    published.newsletter = { visible: true };
    published.rooms = [
      {
        rooms: [
          {
            displayName: "Gabinet",
            photos: [{ url: "/g.webp", alt: "Gabinet" }],
          },
        ],
      },
    ] as RoomsPageLocation[];
    await renderHome();
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent ?? "");
    const position = (text: string) =>
      headings.findIndex((heading) => heading.includes(text));
    const order = [
      "W czym możemy pomóc",
      "Bezpieczna przestrzeń i doświadczony zespół",
      "Od pierwszego kontaktu do wsparcia na dłużej",
      "Przestrzeń, która wspiera",
      "Twoja droga do lepszego samopoczucia",
      "Bądźmy w kontakcie",
      "Potrzebujesz pomocy teraz?",
      "Odwiedź nas",
    ].map(position);
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe("the words the admin publishes", () => {
  it("puts the hero's eyebrow, heading, accent and points on the page", async () => {
    published.hero = {
      ...homePageContentSchema.parse({
        eyebrow: "Psychoterapia w Poznaniu",
        heading: "Wsparcie, które ma sens.",
        accent: "Krok po kroku.",
        body: "Opis centrum.",
        points: [{ label: "Bezpieczna przestrzeń", icon: "shield" }],
      }),
      imageUrl: null,
    };
    await renderHome();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Wsparcie, które ma sens.");
    expect(h1).toHaveTextContent("Krok po kroku.");
    expect(screen.getByText("Psychoterapia w Poznaniu")).toBeInTheDocument();
    expect(screen.getByText("Bezpieczna przestrzeń")).toBeInTheDocument();
    expect(screen.queryByText("Przytulne gabinety")).not.toBeInTheDocument();
  });

  it("shows the published thoughts and the story's steps", async () => {
    published.thoughts = {
      ...defaultHomeThoughts,
      pairs: defaultHomeThoughts.pairs.map((pair, index) =>
        index === 0 ? { ...pair, positive: "Jestem w dobrym miejscu" } : pair,
      ),
    };
    published.story = {
      steps: [
        {
          ...defaultHomeStory.steps[0]!,
          heading: "Spokojny początek",
          cta: null,
          imageUrl: null,
        },
      ],
    };
    await renderHome();
    expect(
      screen.getAllByText("Jestem w dobrym miejscu").length,
    ).toBeGreaterThan(0);
    expect(title("Spokojny początek")).toBeInTheDocument();
    expect(title("Pierwsza rozmowa")).not.toBeInTheDocument();
  });
});

describe("Zajrzyj do środka", () => {
  it("shows the rooms' photos, linking to Gabinety", async () => {
    published.rooms = [
      {
        rooms: [
          {
            displayName: "Gabinet Zielony",
            photos: [{ url: "/zielony.webp", alt: "Gabinet Zielony, fotel" }],
          },
        ],
      },
    ] as RoomsPageLocation[];
    await renderHome();
    const section = screen.getByRole("region", {
      name: "Przestrzeń, która wspiera",
    });
    expect(
      within(section).getByRole("img", { name: "Gabinet Zielony, fotel" }),
    ).toBeInTheDocument();
    expect(
      within(section).getByRole("link", { name: /Zobacz nasze gabinety/ }),
    ).toHaveAttribute("href", "/gabinety");
  });

  it("is left out while no room has a photo", async () => {
    await renderHome();
    expect(
      screen.queryByRole("list", { name: "Zdjęcia gabinetów" }),
    ).not.toBeInTheDocument();
  });
});

describe("Dlaczego my", () => {
  it("is hidden until the CMS shows it", async () => {
    await renderHome();
    expect(
      title("Bezpieczna przestrzeń i doświadczony zespół"),
    ).not.toBeInTheDocument();
  });

  it("shows the published facts", async () => {
    published.whyUs = {
      visible: true,
      facts: [
        { title: "Superwizja", text: "Pod stałą superwizją." },
        { title: "Poufność", text: "Zostaje między nami." },
      ],
    };
    await renderHome();
    const section = screen.getByRole("region", {
      name: "Bezpieczna przestrzeń i doświadczony zespół",
    });
    expect(
      within(section).getByRole("heading", { level: 3, name: "Superwizja" }),
    ).toBeInTheDocument();
    expect(
      within(section).getByText("Zostaje między nami."),
    ).toBeInTheDocument();
  });
});

describe("the newsletter band", () => {
  it("is hidden until the CMS shows it", async () => {
    await renderHome();
    expect(title("Bądźmy w kontakcie")).not.toBeInTheDocument();
  });

  it("shows its header and the sign-up form when switched on", async () => {
    published.newsletter = { visible: true };
    await renderHome();
    const band = screen.getByRole("region", { name: "Bądźmy w kontakcie" });
    expect(
      within(band).getByRole("form", {
        name: "Zapis na newsletter (Kolor Sensu sp. z o.o.)",
      }),
    ).toBeInTheDocument();
  });
});

describe("the crisis strip", () => {
  it("is always there, the published numbers dialling", async () => {
    published.crisis = {
      heading: "Pomoc od zaraz",
      text: "",
      lines: [{ number: "116 123", label: "Telefon zaufania", detail: "" }],
    };
    await renderHome();
    const strip = screen.getByRole("complementary", { name: "Pomoc od zaraz" });
    expect(
      within(strip).getByRole("link", { name: "116 123" }),
    ).toHaveAttribute("href", "tel:116123");
  });

  it("links to the page about help in a crisis", async () => {
    await renderHome();
    const strip = screen.getByRole("complementary", {
      name: defaultCrisisHelp.heading,
    });
    expect(
      within(strip).getByRole("link", { name: /Więcej o pomocy w kryzysie/ }),
    ).toHaveAttribute("href", "/pomoc-w-kryzysie");
  });

  it("starts from 112 before anything is published", async () => {
    await renderHome();
    const strip = screen.getByRole("complementary", {
      name: "Potrzebujesz pomocy teraz?",
    });
    expect(within(strip).getAllByRole("link")[0]).toHaveAttribute(
      "href",
      "tel:112",
    );
  });
});

describe("Gdzie jesteśmy", () => {
  it("shows the company's address, phone and e-mail", async () => {
    await renderHome();
    const section = screen.getByRole("region", { name: "Odwiedź nas" });
    expect(within(section).getByText(/ul. Testowa 1/)).toBeInTheDocument();
    expect(
      within(section).getByRole("link", { name: "+48 600 000 000" }),
    ).toHaveAttribute("href", "tel:+48 600 000 000");
    expect(
      within(section).getByRole("link", { name: /Pokaż na mapie/ }),
    ).toBeInTheDocument();
  });

  it("is hidden when the CMS hides it", async () => {
    published.location = { visible: false };
    await renderHome();
    expect(title("Odwiedź nas")).not.toBeInTheDocument();
  });
});

const anna = {
  specialistId: "6f1c2b9a-3c41-4e2b-9a55-0d3f2a7b8c10",
  publicSlug: "anna-nowak",
  displayName: "Anna Nowak",
  professionalTitle: "Psychoterapeutka",
  shortBio: "Pracuję z dorosłymi.",
  specializations: ["lęk"],
  clientGroups: ["adults"],
  modalities: [],
  portraitUrl: "https://cdn.test/anna.png",
  photoUrl: null,
} as unknown as SpecialistWithMedia;

const team = ["Anna Nowak", "Basia Lis", "Celina Wróbel", "Dorota Sowa"].map(
  (displayName, index) =>
    ({
      ...anna,
      specialistId: `00000000-0000-4000-8000-00000000000${index}`,
      publicSlug: `osoba-${index}`,
      displayName,
    }) as SpecialistWithMedia,
);

describe("Z czym przychodzisz", () => {
  it("shows the published areas of help, each leading on", async () => {
    published.supportAreas = [
      {
        id: "pary",
        title: "Terapia par",
        lead: "Dla dwojga.",
        image: null,
        link: { href: "/oferta", label: "Zobacz" },
      },
    ];
    await renderHome();
    const section = screen.getByRole("region", { name: "W czym możemy pomóc" });
    expect(within(section).getAllByText("Terapia par").length).toBeGreaterThan(
      0,
    );
    expect(
      within(section).getByRole("link", { name: /Zobacz całą ofertę/ }),
    ).toHaveAttribute("href", "/oferta");
  });
});

describe("Pierwszy krok", () => {
  it("shows the four published steps", async () => {
    published.firstSteps = {
      visible: true,
      steps: ["Telefon", "Rozmowa", "Plan", "Praca"].map((title) => ({
        title,
        text: `${title}: opis.`,
      })),
    };
    await renderHome();
    expect(
      screen.getByRole("heading", { name: "Rozmowa" }),
    ).toBeInTheDocument();
  });

  it("is hidden when the CMS hides it", async () => {
    published.firstSteps = { ...defaultFirstSteps, visible: false };
    await renderHome();
    expect(
      title("Od pierwszego kontaktu do wsparcia na dłużej"),
    ).not.toBeInTheDocument();
  });
});

describe("Z kim porozmawiasz", () => {
  it("presents the specialist the CMS chose, leading to booking and the profile", async () => {
    published.specialists = [anna];
    published.sections = {
      ...published.sections,
      spotlight: {
        ...published.sections.spotlight,
        visible: true,
        specialistId: anna.specialistId,
      },
    };
    await renderHome();
    const section = screen.getByRole("region", { name: "Z kim porozmawiasz" });
    expect(within(section).getByText("Anna Nowak")).toBeInTheDocument();
    expect(
      within(section)
        .getAllByRole("link")
        .some(
          (link) => link.getAttribute("href") === "/specjalisci/anna-nowak",
        ),
    ).toBe(true);
  });

  it("is hidden while the chosen specialist is not on the site", async () => {
    published.specialists = [];
    published.sections = {
      ...published.sections,
      spotlight: {
        ...published.sections.spotlight,
        visible: true,
        specialistId: anna.specialistId,
      },
    };
    await renderHome();
    expect(title("Z kim porozmawiasz")).not.toBeInTheDocument();
  });
});

describe("Nasi specjaliści", () => {
  it("shows the first three specialists", async () => {
    published.specialists = team;
    published.sections = { ...published.sections, showSpecialists: true };
    await renderHome();
    const section = screen.getByRole("region", { name: "Poznaj nasz zespół" });
    expect(within(section).getByText("Celina Wróbel")).toBeInTheDocument();
    expect(within(section).queryByText("Dorota Sowa")).not.toBeInTheDocument();
  });

  it("is hidden when the CMS hides it or nobody is on the site", async () => {
    published.specialists = team;
    published.sections = { ...published.sections, showSpecialists: false };
    await renderHome();
    expect(title("Poznaj nasz zespół")).not.toBeInTheDocument();
    cleanup();

    published.specialists = [];
    published.sections = { ...published.sections, showSpecialists: true };
    await renderHome();
    expect(title("Poznaj nasz zespół")).not.toBeInTheDocument();
  });
});

describe("Gdzie jesteśmy without the company's details", () => {
  it("is left out rather than promising them", async () => {
    published.contact = undefined;
    await renderHome();
    expect(title("Odwiedź nas")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Dane kontaktowe pojawią się/),
    ).not.toBeInTheDocument();
  });
});

describe("the closing invitation", () => {
  it("leads to booking and to Kontakt", async () => {
    await renderHome();
    const heading = screen.getByRole("heading", {
      name: "Zrób pierwszy krok do lepszego samopoczucia",
    });
    const band =
      heading.closest("section") ?? heading.parentElement!.parentElement!;
    const links = within(band as HTMLElement).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      expect.arrayContaining(["/umow-wizyte", "/kontakt"]),
    );
  });
});
