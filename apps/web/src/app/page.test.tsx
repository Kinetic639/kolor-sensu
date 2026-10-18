// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  defaultCrisisHelp,
  defaultFirstSteps,
  defaultHomeHeaders,
  defaultHomeLocation,
  defaultHomeSections,
  defaultNewsletterBand,
  defaultWhyUs,
  type CrisisHelpContent,
  type HomeLocationContent,
  type NewsletterBandContent,
  type WhyUsContent,
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

// The homepage as a visitor gets it, with what the CMS publishes stood in
// for: each loader returns the site's own content (as before anything is
// published) unless a test publishes something else.
const published: {
  whyUs: WhyUsContent;
  newsletter: NewsletterBandContent;
  location: HomeLocationContent;
  crisis: CrisisHelpContent;
} = {
  whyUs: defaultWhyUs,
  newsletter: defaultNewsletterBand,
  location: defaultHomeLocation,
  crisis: defaultCrisisHelp,
};

vi.mock("@/lib/public-data", () => ({
  getHomeContent: async () => null,
  getHomeHeaders: async () => defaultHomeHeaders,
  getSupportAreas: async () => null,
  getFirstSteps: async () => defaultFirstSteps,
  getHomeSections: async () => ({
    ...defaultHomeSections,
    spotlightImage: null,
  }),
  getSpecialists: async () => [],
  getWhyUs: async () => published.whyUs,
  getNewsletterBand: async () => published.newsletter,
  getHomeLocation: async () => published.location,
  getCrisisHelp: async () => published.crisis,
}));

vi.mock("@/lib/site-frame", () => ({
  getSiteFrame: async () => ({
    contact: {
      address: {
        street: "ul. Testowa 1",
        postalCode: "00-001",
        city: "Warszawa",
      },
      phone: "+48 600 000 000",
      email: "kontakt@example.invalid",
      hours: "Pn–Pt 8:00–20:00",
    },
  }),
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
  published.whyUs = defaultWhyUs;
  published.newsletter = defaultNewsletterBand;
  published.location = defaultHomeLocation;
  published.crisis = defaultCrisisHelp;
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

  it("shows its sections in the agreed order, every one switched on", async () => {
    published.whyUs = { ...defaultWhyUs, visible: true };
    published.newsletter = { visible: true };
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

  it("shows its header when switched on", async () => {
    published.newsletter = { visible: true };
    await renderHome();
    expect(
      screen.getByRole("region", { name: "Bądźmy w kontakcie" }),
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
